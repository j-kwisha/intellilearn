import unittest
from chat_intents import matches_keyword


class ChatIntentTests(unittest.TestCase):
    def test_greetings_do_not_match_inside_document_requests(self):
        for message in ['I need you to summarize this', 'Explain the history of computing', 'Which slide covers privacy?']:
            for keyword in ['hi', 'hey', 'hello']:
                with self.subTest(message=message, keyword=keyword):
                    self.assertFalse(matches_keyword(message, keyword))

    def test_real_greetings_and_phrases_match_with_punctuation(self):
        for message, keyword in [('Hi!', 'hi'), ('HELLO there', 'hello'), ('Good morning!', 'good morning'), ('What is TCP/IP?', 'tcp/ip')]:
            self.assertTrue(matches_keyword(message, keyword))

    def test_short_keywords_do_not_match_inside_other_words(self):
        self.assertFalse(matches_keyword('Explain cybersecurity and privacy.', 'ty'))
        self.assertFalse(matches_keyword('Show the programming framework.', 'ram'))
        self.assertTrue(matches_keyword('Thanks, that helps.', 'thanks'))


if __name__ == '__main__':
    unittest.main()
