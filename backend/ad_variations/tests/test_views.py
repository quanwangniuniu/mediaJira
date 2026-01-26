from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Organization, Project
from ad_variations.models import AdGroup, AdVariation, VariationStatusHistory


class AdVariationsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="owner@example.com",
            username="owner",
            password="pass1234",
        )
        self.org = Organization.objects.create(name="Acme Co")
        self.project = Project.objects.create(
            name="Spring Launch",
            organization=self.org,
            owner=self.user,
        )
        self.client.force_authenticate(self.user)

    def test_create_variation(self):
        payload = {
            "name": "Variation A",
            "creativeType": "image",
            "status": "Draft",
            "tags": [],
            "notes": "",
        }
        response = self.client.post(
            f"/api/campaigns/{self.project.id}/variations",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], payload["name"])
        self.assertTrue(AdVariation.objects.filter(name=payload["name"]).exists())

    def test_assign_variations_to_group(self):
        variation = AdVariation.objects.create(
            campaign=self.project,
            name="Variation B",
            creative_type="image",
            status="Draft",
            tags=[],
        )
        group = AdGroup.objects.create(
            campaign=self.project,
            name="Group 1",
        )

        response = self.client.post(
            f"/api/campaigns/{self.project.id}/ad-groups/{group.id}/variations",
            {"variationIds": [variation.id]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        variation.refresh_from_db()
        self.assertEqual(variation.ad_group_id, group.id)

    def test_compare_variations(self):
        variation_a = AdVariation.objects.create(
            campaign=self.project,
            name="Variation C",
            creative_type="image",
            status="Draft",
            tags=[],
        )
        variation_b = AdVariation.objects.create(
            campaign=self.project,
            name="Variation D",
            creative_type="image",
            status="Draft",
            tags=[],
        )

        response = self.client.post(
            f"/api/campaigns/{self.project.id}/variations/compare",
            {"variationIds": [variation_a.id, variation_b.id]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("columns", response.data)
        self.assertIn("rows", response.data)

    def test_change_status_creates_history(self):
        variation = AdVariation.objects.create(
            campaign=self.project,
            name="Variation E",
            creative_type="image",
            status="Draft",
            tags=[],
        )

        response = self.client.post(
            f"/api/campaigns/{self.project.id}/variations/{variation.id}/status",
            {"toStatus": "Winner", "reason": "Benchmark"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        variation.refresh_from_db()
        self.assertEqual(variation.status, "Winner")
        self.assertTrue(
            VariationStatusHistory.objects.filter(
                variation=variation,
                to_status="Winner",
            ).exists()
        )
