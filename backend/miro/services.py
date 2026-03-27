from django.db import transaction
from django.db.models import QuerySet

from core.models import ProjectMember
from miro.models import Board, BoardAccess


def user_has_project_access(user, project_id: int) -> bool:
    return ProjectMember.objects.filter(
        user=user,
        project_id=project_id,
        is_active=True,
    ).exists()


def get_accessible_board_for_user(user, board_id) -> Board:
    return Board.objects.select_related("project").get(
        id=board_id,
        project__members__user=user,
        project__members__is_active=True,
    )


def get_project_boards_queryset(project_id: int) -> QuerySet[Board]:
    return Board.objects.filter(
        project_id=project_id,
        is_archived=False,
    ).order_by("-updated_at", "-created_at")


def get_latest_project_board_for_user(user, project_id: int) -> Board | None:
    access = (
        BoardAccess.objects.select_related("board")
        .filter(user=user, project_id=project_id, board__is_archived=False)
        .first()
    )
    if access:
        return access.board
    return get_project_boards_queryset(project_id).first()


@transaction.atomic
def record_board_access(user, board: Board) -> BoardAccess:
    board_access, _ = BoardAccess.objects.update_or_create(
        user=user,
        project=board.project,
        defaults={"board": board},
    )
    return board_access
