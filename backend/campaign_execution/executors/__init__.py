from typing import Dict, Type
from .base import BaseExecutor
from .google import GoogleAdsExecutor
from .fb import FacebookAdsExecutor

REGISTRY: Dict[str, Type[BaseExecutor]] = {
    "google": GoogleAdsExecutor,
    "facebook": FacebookAdsExecutor,
}

def get_executor(channel: str, cfg: dict) -> BaseExecutor:
    if channel not in REGISTRY:
        raise ValueError(f"Unsupported channel: {channel}")
    klass = REGISTRY[channel]
    credentials = {"token": cfg.get("auth_token"), **cfg.get("credentials", {})}
    settings = cfg.get("settings_json", cfg.get("settings", {})) or {}
    return klass(credentials=credentials, settings=settings)
