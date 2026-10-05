import unittest
from unittest.mock import Mock
from types import SimpleNamespace
from essay_grading import parse_json, validate_rubric, validate_evaluation, request_json


class EssayValidationTests(unittest.TestCase):
    def rubric(self):
        return {'title': 'Source Rubric', 'total_points': 10, 'criteria': [
            {'id': 1, 'criterion': 'Accuracy', 'description': 'Three accurate risks.', 'max_points': 6,
             'levels': [{'label': 'Beginning', 'description': 'Partial accuracy.', 'min_points': 0, 'max_points': 3},
                        {'label': 'Excellent', 'description': 'All three accurate.', 'min_points': 3, 'max_points': 6}]},
            {'id': 2, 'criterion': 'Evidence', 'description': 'Specific source evidence.', 'max_points': 4,
             'levels': [{'label': 'All levels', 'description': 'Source evidence quality.', 'min_points': 0, 'max_points': 4}]},
        ]}

    def result(self):
        return {'total_score': 999, 'criteria': [
            {'criterion_id': 1, 'awarded_points': 4, 'feedback': 'Two accurate risks.'},
            {'criterion_id': 2, 'awarded_points': 3, 'feedback': 'Relevant evidence.'},
        ], 'overall_feedback': 'Good work.', 'strengths': [], 'areas_for_improvement': []}

    def test_recomputes_total_and_uses_saved_names_and_maxima(self):
        result = self.result()
        result['criteria'][0]['criterion_name'] = 'Invented'
        result['criteria'][0]['max_points'] = 100
        scored = validate_evaluation(result, self.rubric())
        self.assertEqual(scored['total_score'], 7)
        self.assertEqual(scored['percentage'], 70)
        self.assertEqual(scored['criteria'][0]['criterion_name'], 'Accuracy')
        self.assertEqual(scored['criteria'][0]['max_points'], 6)

    def test_rejects_negative_nonfinite_over_max_and_extra_precision(self):
        for invalid in [-1, float('nan'), float('inf'), 7, 1.001, True]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                result = self.result(); result['criteria'][0]['awarded_points'] = invalid
                validate_evaluation(result, self.rubric())

    def test_rejects_missing_duplicate_and_unknown_criteria(self):
        for rows in [self.result()['criteria'][:1], [self.result()['criteria'][0]] * 2,
                     [{'criterion_id': 999, 'awarded_points': 1, 'feedback': 'Invalid'}] + self.result()['criteria'][1:]]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                result = self.result(); result['criteria'] = rows
                validate_evaluation(result, self.rubric())

    def test_rubric_rejects_bad_totals_and_levels(self):
        for field, value in [('max_points', 7), ('max_points', -1)]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                rubric = self.rubric(); rubric['criteria'][0][field] = value
                validate_rubric(rubric, 10, require_ids=True)
        rubric = self.rubric(); rubric['criteria'][0]['levels'][1]['min_points'] = 2
        with self.assertRaises(ValueError): validate_rubric(rubric, 10, require_ids=True)

    def test_valid_rubric_preserves_levels_and_ids(self):
        rubric = validate_rubric(self.rubric(), 10, require_ids=True)
        self.assertEqual(rubric['criteria'][0]['id'], 1)
        self.assertEqual(len(rubric['criteria'][0]['levels']), 2)

    def test_rejects_malformed_json_and_duplicate_keys(self):
        for raw in ['not json', '{"criteria":[],"criteria":[]}', '[]']:
            with self.subTest(raw=raw), self.assertRaises(ValueError): parse_json(raw)

    def test_provider_errors_propagate_instead_of_becoming_pending(self):
        client = Mock()
        client.chat.completions.create.side_effect = TimeoutError('Provider timed out')
        with self.assertRaises(TimeoutError):
            request_json(client, 'test-model', 'Grade', {})

    def test_provider_malformed_and_truncated_responses_raise_errors(self):
        for raw, finish in [('{broken json', 'stop'), ('{}', 'length')]:
            client = Mock()
            client.chat.completions.create.return_value = SimpleNamespace(choices=[
                SimpleNamespace(finish_reason=finish, message=SimpleNamespace(content=raw))])
            with self.subTest(finish=finish), self.assertRaises(ValueError):
                request_json(client, 'test-model', 'Grade', {})


if __name__ == '__main__':
    unittest.main()
