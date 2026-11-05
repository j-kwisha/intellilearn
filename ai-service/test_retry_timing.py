import unittest
from types import SimpleNamespace

from retry_timing import provider_retry_after_seconds


class RetryTimingTests(unittest.TestCase):
    def test_uses_provider_retry_after_and_rounds_up(self):
        error = SimpleNamespace(response=SimpleNamespace(headers={"retry-after": "127.2"}))
        self.assertEqual(provider_retry_after_seconds(error), 128)

    def test_missing_or_invalid_provider_wait_is_unknown(self):
        for headers in ({}, {"retry-after": "not-a-number"}, {"retry-after": "0"}):
            error = SimpleNamespace(response=SimpleNamespace(headers=headers))
            self.assertIsNone(provider_retry_after_seconds(error))


if __name__ == "__main__":
    unittest.main()
