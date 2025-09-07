from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional, TypedDict

class ExecutorError(Exception): ...
class ExecutorAuthError(ExecutorError): ...
class ExecutorRateLimitError(ExecutorError): ...
class ExecutorTransientError(ExecutorError): ...

@dataclass
class LaunchPayload:
    title: str
    audience: Dict[str, Any]
    creatives: list

class ExternalIds(TypedDict, total=False):
    accountId: str
    campaignId: str
    adSetIds: list
    adGroupIds: list
    adIds: list
    assetIds: list

class StatusPayload(TypedDict, total=False):
    state: str          # RUNNING/PAUSED/COMPLETED/FAILED/ERROR
    spend: float
    roi: float
    roas: float
    cpa: float
    ctr: float
    cpc: float
    native: Dict[str, Any]

class BaseExecutor(ABC):
    def __init__(self, credentials: Dict[str, Any], settings: Dict[str, Any]):
        self.credentials = credentials
        self.settings = settings

    @abstractmethod
    def launch(self, data: LaunchPayload) -> ExternalIds: ...

    @abstractmethod
    def pause(self, ids: ExternalIds) -> Dict[str, Any]: ...

    @abstractmethod
    def resume(self, ids: ExternalIds) -> Dict[str, Any]: ...

    @abstractmethod
    def get_status(self, ids: ExternalIds) -> StatusPayload: ...

    def normalize_status(self, s: StatusPayload) -> StatusPayload:
        return s
