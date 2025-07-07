from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.views import View

class AssetListView(View):
    def get(self, request):
        return JsonResponse({'assets': []})

class CampaignEditView(View):
    def put(self, request, pk):
        return JsonResponse({'campaign': pk})