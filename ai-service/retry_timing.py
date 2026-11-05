"""Read a provider's suggested retry delay from an API error."""

import math


def provider_retry_after_seconds(error):
    response = getattr(error, "response", None)
    headers = getattr(response, "headers", None)
    if headers is None:
        return None

    try:
        seconds = float(headers.get("retry-after", ""))
    except (TypeError, ValueError):
        return None

    if not math.isfinite(seconds) or seconds <= 0:
        return None
    return math.ceil(seconds)
