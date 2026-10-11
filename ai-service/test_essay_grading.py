import unittest
from unittest.mock import Mock, patch
from types import SimpleNamespace
from essay_grading import parse_json, validate_rubric, validate_evaluation, request_json, generate_rubric_draft


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

    def generation_input(self, points=10):
        return {'question': 'Explain three source risks.', 'max_points': points,
                'reference_material': 'Privacy, bias and overreliance are risks.'}

    @patch('essay_grading.request_json')
    def test_generation_corrects_bad_point_totals_once_and_preserves_source_context(self, request):
        invalid = self.rubric()
        invalid['criteria'][0]['max_points'] = 7
        request.side_effect = [invalid, self.rubric()]
        data = self.generation_input()
        result = generate_rubric_draft(Mock(), 'test-model', data)
        self.assertEqual(sum(c['max_points'] for c in result['criteria']), 10)
        self.assertEqual(request.call_count, 2)
        correction = request.call_args.args[3]
        self.assertEqual(correction['reference_material'], data['reference_material'])
        self.assertEqual(correction['question'], data['question'])
        self.assertEqual(correction['previous_draft'], invalid)
        self.assertIn('Criterion totals', correction['validation_feedback'])
        self.assertEqual(request.call_args.kwargs['timeout'], 20)
        self.assertEqual(request.call_args.kwargs['max_tokens'], 900)
        self.assertNotIn('previous_draft', data)

    @patch('essay_grading.request_json')
    def test_valid_small_point_rubric_succeeds_without_correction(self, request):
        rubric = {'title': 'One-point essay', 'total_points': 1, 'criteria': [
            {'criterion': 'Accuracy', 'description': 'Explains the source concepts.', 'max_points': 0.6,
             'levels': [{'label': 'Beginning', 'description': 'Limited explanation.', 'min_points': 0, 'max_points': 0.3},
                        {'label': 'Excellent', 'description': 'Accurate explanation.', 'min_points': 0.3, 'max_points': 0.6}]},
            {'criterion': 'Evidence', 'description': 'Uses source examples.', 'max_points': 0.4,
             'levels': [{'label': 'All levels', 'description': 'Quality of source evidence.', 'min_points': 0, 'max_points': 0.4}]},
        ]}
        request.return_value = rubric
        result = generate_rubric_draft(Mock(), 'test-model', self.generation_input(1))
        self.assertEqual(result['total_points'], 1)
        request.assert_called_once()

    @patch('essay_grading.request_json')
    def test_generation_never_returns_an_invalid_rubric_after_the_correction_limit(self, request):
        invalid = self.rubric()
        invalid['criteria'][0]['levels'][0]['max_points'] = 0.333
        request.return_value = invalid
        with self.assertRaisesRegex(ValueError, 'at most two decimals'):
            generate_rubric_draft(Mock(), 'test-model', self.generation_input())
        self.assertEqual(request.call_count, 2)
        # Saved-rubric validation remains strict; generation never rounds student scores.
        with self.assertRaises(ValueError): validate_rubric(invalid, 10)

    @patch('essay_grading.request_json')
    def test_generation_retries_malformed_json_but_not_provider_timeouts(self, request):
        request.side_effect = [ValueError('Expected JSON object'), self.rubric()]
        self.assertEqual(generate_rubric_draft(Mock(), 'test-model', self.generation_input())['total_points'], 10)
        self.assertIsNone(request.call_args.args[3]['previous_draft'])
        request.reset_mock()
        request.side_effect = TimeoutError('Provider timeout')
        with self.assertRaises(TimeoutError): generate_rubric_draft(Mock(), 'test-model', self.generation_input())
        request.assert_called_once()

    @patch('essay_grading.request_json')
    def test_generation_rejects_invalid_question_points_before_calling_the_provider(self, request):
        for points in [0, -1, True, 'NaN', 1000]:
            with self.subTest(points=points), self.assertRaises(ValueError):
                generate_rubric_draft(Mock(), 'test-model', self.generation_input(points))
        request.assert_not_called()

    def test_malformed_rubric_structure_is_a_validation_error(self):
        for data in [None, [], {'total_points': 10, 'criteria': ['invalid']}]:
            with self.subTest(data=data), self.assertRaises(ValueError): validate_rubric(data, 10)
        rubric = self.rubric()
        rubric['criteria'][0]['levels'] = [None]
        with self.assertRaises(ValueError): validate_rubric(rubric, 10)

    def test_rubric_output_budget_is_sent_to_provider_without_changing_grading_default(self):
        client = Mock()
        client.chat.completions.create.return_value = SimpleNamespace(choices=[
            SimpleNamespace(finish_reason='stop', message=SimpleNamespace(content='{}'))])
        request_json(client, 'test-model', 'Generate', {}, timeout=20, max_tokens=900)
        self.assertEqual(client.chat.completions.create.call_args.kwargs['max_tokens'], 900)
        request_json(client, 'test-model', 'Grade', {})
        self.assertEqual(client.chat.completions.create.call_args.kwargs['max_tokens'], 6000)


if __name__ == '__main__':
    unittest.main()
