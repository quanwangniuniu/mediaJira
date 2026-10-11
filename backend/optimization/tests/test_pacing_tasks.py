from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from optimization.tasks import recompute_all_pacing_forecasts


class PacingCoordinatorTaskTest(SimpleTestCase):
    @patch('optimization.tasks._stale_meta_account_ids', return_value=[])
    @patch('campaign.models.Campaign.objects.filter')
    @patch('optimization.tasks.group')
    def test_large_campaign_set_is_dispatched_in_bounded_batches(
        self, mock_group, mock_filter, _mock_freshness
    ):
        queryset = MagicMock()
        mock_filter.return_value = queryset
        queryset.exclude.return_value = queryset
        queryset.order_by.return_value = queryset
        queryset.values_list.return_value = list(range(205))

        queued_signatures = []
        job = MagicMock(id='group-123')

        def capture_group(signatures):
            queued_signatures.extend(list(signatures))
            grouped = MagicMock()
            grouped.apply_async.return_value = job
            return grouped

        mock_group.side_effect = capture_group

        result = recompute_all_pacing_forecasts.run()

        self.assertEqual(result['status'], 'queued')
        self.assertEqual(result['campaigns'], 205)
        self.assertEqual(result['batches'], 3)
        self.assertEqual([len(signature.args[0]) for signature in queued_signatures], [100, 100, 5])

    @patch('optimization.tasks._stale_meta_account_ids', return_value=[10, 11])
    def test_stale_spend_retries_instead_of_publishing_a_stale_forecast(self, _mock_freshness):
        retry_error = RuntimeError('retry requested')
        with patch.object(recompute_all_pacing_forecasts, 'retry', side_effect=retry_error) as retry:
            with self.assertRaisesRegex(RuntimeError, 'retry requested'):
                recompute_all_pacing_forecasts.run()

        retry.assert_called_once_with(countdown=600)
