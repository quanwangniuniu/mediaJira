from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn, os, time

app = FastAPI()
MEM = {}  # cid -> {"state": "...", "roi": float, "spend": float}

class LaunchIn(BaseModel):
    name: Optional[str] = None
    audience: Optional[Dict[str, Any]] = None
    creatives: Optional[List[Any]] = None

@app.post("/campaigns")
def launch(inb: LaunchIn):
    cid = f"cmp_{int(time.time()*1000)}"
    MEM[cid] = {"state": "ENABLED", "roi": 1.5, "spend": 0.0}
    if os.getenv("FLAVOR", "google") == "google":
        return {"accountId": "acc_g", "campaignId": cid}
    else:
        return {"account": "act_f", "id": cid}

@app.post("/campaigns/{cid}/pause")
def pause(cid: str):
    if cid in MEM:
        MEM[cid]["state"] = "PAUSED"
    return {"ok": True}

@app.get("/campaigns/{cid}/status")
def status(cid: str):
    if cid not in MEM:
        return {"state": "ERROR", "status": "ERROR", "roi": 0, "spend": 0, "spent": 0}
    m = MEM[cid]
    m["spend"] = round(m.get("spend", 0.0) + 0.25, 2)
    if m["spend"] > 2.0 and m["state"] not in ("PAUSED", "ENDED", "COMPLETED"):
        m["state"] = os.getenv("END_STATE", "ENDED")
    return {
        "state": m["state"],                                # Google: ENABLED/PAUSED/ENDED
        "status": "ACTIVE" if m["state"] == "ENABLED" else m["state"],  # FB 兼容字段
        "roi": m["roi"],
        "spend": m["spend"],
        "spent": int(m["spend"] * 100),
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
