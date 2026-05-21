import pytest
from pydantic_ai.exceptions import ModelHTTPError

from app.services.provider_retry import retry_provider_call


def _model_error(status_code: int, status: str, message: str) -> ModelHTTPError:
    return ModelHTTPError(
        status_code=status_code,
        model_name="gemini-2.5-flash-lite",
        body={"error": {"status": status, "message": message}},
    )


@pytest.mark.asyncio
async def test_retries_transient_provider_503_then_succeeds():
    calls = 0
    sleeps: list[float] = []

    async def operation():
        nonlocal calls
        calls += 1
        if calls == 1:
            raise _model_error(503, "UNAVAILABLE", "high demand")
        return "ok"

    async def fake_sleep(delay: float):
        sleeps.append(delay)

    result = await retry_provider_call(
        operation,
        operation_name="test",
        max_attempts=3,
        base_delay_seconds=0.25,
        sleep=fake_sleep,
    )

    assert result == "ok"
    assert calls == 2
    assert sleeps == [0.25]


@pytest.mark.asyncio
async def test_raises_original_provider_error_after_exhausting_retries():
    calls = 0

    async def operation():
        nonlocal calls
        calls += 1
        raise _model_error(503, "UNAVAILABLE", "high demand")

    async def fake_sleep(_delay: float):
        return None

    with pytest.raises(ModelHTTPError) as exc_info:
        await retry_provider_call(
            operation,
            operation_name="test",
            max_attempts=2,
            base_delay_seconds=0,
            sleep=fake_sleep,
        )

    assert calls == 2
    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_does_not_retry_quota_or_auth_errors():
    for provider_error in (
        _model_error(429, "RESOURCE_EXHAUSTED", "quota exceeded"),
        _model_error(403, "PERMISSION_DENIED", "bad key"),
        _model_error(400, "INVALID_ARGUMENT", "invalid request"),
        _model_error(400, "FAILED_PRECONDITION", "blocked by safety filters"),
    ):
        calls = 0

        async def operation(error=provider_error):
            nonlocal calls
            calls += 1
            raise error

        with pytest.raises(ModelHTTPError):
            await retry_provider_call(
                operation,
                operation_name="test",
                max_attempts=3,
                base_delay_seconds=0,
            )

        assert calls == 1
