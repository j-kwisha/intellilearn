import json
import unittest

from quiz_generation import generate_quiz_draft


class FakeResponse:
    def __init__(self, content):
        self.choices = [type("Choice", (), {"message": type("Message", (), {"content": content})()})()]


class FakeClient:
    def with_options(self, **kwargs):
        return self

    class chat:
        class completions:
            @staticmethod
            def create(**kwargs):
                return FakeResponse(json.dumps({"questions": [{
                    "question_text": "Which layer routes packets?", "options": ["Network", "Physical"],
                    "correct_answer": "Network", "points": 10,
                }]}))


class QuizGenerationTests(unittest.TestCase):
    def test_validates_and_limits_generated_draft(self):
        result = generate_quiz_draft(FakeClient(), "The network layer routes packets.", count=5)
        self.assertEqual(len(result["questions"]), 1)
        self.assertEqual(result["questions"][0]["correct_answer"], "Network")

    def test_rejects_empty_source(self):
        with self.assertRaises(ValueError):
            generate_quiz_draft(FakeClient(), " ")


if __name__ == "__main__":
    unittest.main()
