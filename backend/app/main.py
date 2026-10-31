# from contextlib import asynccontextmanager

# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# from .config import settings
# from .database import SessionLocal
# from .deps import DEMO_USER_ID, DEMO_USERNAME
# from .models import User
# from .routers import admin, community, cycle, poll, users, wellness
# from .routers import admin, community, cycle, dashboard, poll, users, wellness
# from .routers import admin, community, cycle, dashboard, metrics, poll, users, wellness
# from .routers import admin, community, cycle, dashboard, metrics, notifications, poll, users, wellness
# from .routers import admin, auth, community, cycle, dashboard, metrics, notifications, poll, users, wellness
# from .routers import preferences




# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Tables are created by Alembic now. Run `alembic upgrade head` before starting the server.
#     with SessionLocal() as db:
#         user = db.get(User, DEMO_USER_ID)  # demo user: remove when you add real auth
#         if user is None:
#             db.add(User(id=DEMO_USER_ID, username=DEMO_USERNAME, is_admin=True))
#         else:
#             if user.username is None:
#                 user.username = DEMO_USERNAME
#             user.is_admin = True  # demo only: with real auth, set is_admin by hand in the database
#         db.commit()
#     yield


# app = FastAPI(title="FemVita API", lifespan=lifespan)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[settings.frontend_origin],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(cycle.router)
# app.include_router(wellness.router)
# app.include_router(users.router)
# app.include_router(community.router)
# app.include_router(poll.router)
# app.include_router(admin.router)
# app.include_router(dashboard.router)
# app.include_router(metrics.router)
# app.include_router(notifications.router)
# app.include_router(auth.router)
# app.include_router(preferences.router)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import admin, auth, community, cycle, dashboard, metrics, notifications, poll, preferences, users, wellness

# Tables are created by Alembic: run `alembic upgrade head` before starting the server.
# There is no demo user any more. Make the first moderator by hand:
#   UPDATE users SET is_admin = true WHERE email = 'you@example.com';
app = FastAPI(
    title="FemVita API",
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cycle.router)
app.include_router(wellness.router)
app.include_router(users.router)
app.include_router(community.router)
app.include_router(poll.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(metrics.router)
app.include_router(notifications.router)
app.include_router(preferences.router)


@app.get("/api/health")
def health():
    return {"ok": True}