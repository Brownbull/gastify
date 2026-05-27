"""Backend-native prompt lab with separate receipt and statement lanes.

Receipt-specific code lives in :mod:`app.prompt_lab.receipt`. Statement-specific
code lives in :mod:`app.prompt_lab.statement`. Shared CLI, cache, cost, and path
helpers stay at this package root.
"""
