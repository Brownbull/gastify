from app.services.scan_providers import mock_case_for_scan


def test_mock_provider_defaults_to_happy_case():
    assert mock_case_for_scan("receipt.jpg").key == "happy"


def test_mock_provider_selects_review_case_from_filename():
    assert mock_case_for_scan("unknown-merchant-review.jpg").key == "review"


def test_mock_provider_selects_failure_case_from_filename():
    case = mock_case_for_scan("scan-failure.jpg")

    assert case.key == "failure"
    assert case.outcome == "failure"
