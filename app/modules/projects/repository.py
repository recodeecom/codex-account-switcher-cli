from __future__ import annotations

from collections.abc import Sequence
from typing import Literal

from sqlalchemy import case, select, text, update
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project, SwitchboardWorkspace
from app.modules.workspaces.service import DEFAULT_WORKSPACE_LABEL, DEFAULT_WORKSPACE_NAME, slugify_workspace_name


class ProjectRepositoryConflictError(ValueError):
    def __init__(self, field: Literal["name", "path", "unknown"] = "unknown") -> None:
        self.field = field
        super().__init__("Project already exists")


class ProjectsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_entries(self) -> Sequence[Project]:
        await self._ensure_projects_table()
        workspace_id = await self._resolve_active_workspace_id()
        result = await self._session.execute(
            select(Project)
            .where(Project.workspace_id == workspace_id)
            .order_by(Project.created_at, Project.name)
        )
        return list(result.scalars().all())

    async def get_entry(self, project_id: str) -> Project | None:
        await self._ensure_projects_table()
        workspace_id = await self._resolve_active_workspace_id()
        result = await self._session.execute(
            select(Project)
            .where(Project.id == project_id)
            .where(Project.workspace_id == workspace_id)
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def exists_name(self, name: str) -> bool:
        await self._ensure_projects_table()
        workspace_id = await self._resolve_active_workspace_id()
        result = await self._session.execute(
            select(Project.id)
            .where(Project.workspace_id == workspace_id)
            .where(Project.name == name)
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def exists_path(
        self,
        project_path: str,
        *,
        exclude_project_id: str | None = None,
    ) -> bool:
        await self._ensure_projects_table()
        workspace_id = await self._resolve_active_workspace_id()
        query = (
            select(Project.id)
            .where(Project.workspace_id == workspace_id)
            .where(Project.project_path == project_path)
            .limit(1)
        )
        if exclude_project_id:
            query = query.where(Project.id != exclude_project_id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none() is not None

    async def add(
        self,
        name: str,
        description: str | None,
        project_url: str | None,
        github_repo_url: str | None,
        project_path: str | None,
        sandbox_mode: str,
        git_branch: str | None,
    ) -> Project:
        await self._ensure_projects_table()
        workspace_id = await self._resolve_active_workspace_id()
        row = Project(
            workspace_id=workspace_id,
            name=name,
            description=description,
            project_url=project_url,
            github_repo_url=github_repo_url,
            project_path=project_path,
            sandbox_mode=sandbox_mode,
            git_branch=git_branch,
        )
        self._session.add(row)
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise ProjectRepositoryConflictError(_detect_conflict_field(exc)) from exc
        await self._session.refresh(row)
        return row

    async def update(
        self,
        project_id: str,
        name: str,
        description: str | None,
        project_url: str | None,
        github_repo_url: str | None,
        project_path: str | None,
        sandbox_mode: str,
        git_branch: str | None,
    ) -> Project | None:
        await self._ensure_projects_table()
        workspace_id = await self._resolve_active_workspace_id()
        result = await self._session.execute(
            select(Project)
            .where(Project.id == project_id)
            .where(Project.workspace_id == workspace_id)
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        row.name = name
        row.description = description
        row.project_url = project_url
        row.github_repo_url = github_repo_url
        row.project_path = project_path
        row.sandbox_mode = sandbox_mode
        row.git_branch = git_branch
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            raise ProjectRepositoryConflictError(_detect_conflict_field(exc)) from exc
        await self._session.refresh(row)
        return row

    async def delete(self, project_id: str) -> bool:
        await self._ensure_projects_table()
        workspace_id = await self._resolve_active_workspace_id()
        result = await self._session.execute(
            select(Project)
            .where(Project.id == project_id)
            .where(Project.workspace_id == workspace_id)
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.commit()
        return True

    async def _ensure_projects_table(self) -> None:
        await self._ensure_workspaces_table()
        try:
            await self._session.execute(select(Project.id, Project.project_url, Project.github_repo_url).limit(1))
            return
        except OperationalError as exc:
            if _is_missing_projects_workspace_scope_error(exc):
                await self._session.rollback()
                await self._repair_projects_workspace_scope()
                return
            if _is_missing_projects_url_column_error(exc):
                await self._session.rollback()
                await self._repair_projects_url_column()
                return
            if _is_missing_projects_github_repo_url_column_error(exc):
                await self._session.rollback()
                await self._repair_projects_github_repo_url_column()
                return
            if not _is_missing_projects_table_error(exc):
                raise
            await self._session.rollback()

        await self._session.run_sync(
            lambda sync_session: Project.metadata.create_all(
                bind=sync_session.get_bind(),
                checkfirst=True,
            )
        )
        await self._session.commit()

    async def _ensure_workspaces_table(self) -> None:
        try:
            await self._session.execute(select(SwitchboardWorkspace.id).limit(1))
            return
        except OperationalError as exc:
            if not _is_missing_workspaces_table_error(exc):
                raise
            await self._session.rollback()

        await self._session.run_sync(
            lambda sync_session: SwitchboardWorkspace.metadata.create_all(
                bind=sync_session.get_bind(),
                checkfirst=True,
            )
        )
        await self._session.commit()

    async def _resolve_active_workspace_id(self) -> str:
        result = await self._session.execute(
            select(SwitchboardWorkspace).order_by(
                case((SwitchboardWorkspace.is_active, 0), else_=1),
                SwitchboardWorkspace.created_at,
                SwitchboardWorkspace.name,
            )
        )
        rows = list(result.scalars().all())
        if not rows:
            seeded = SwitchboardWorkspace(
                name=DEFAULT_WORKSPACE_NAME,
                slug=slugify_workspace_name(DEFAULT_WORKSPACE_NAME),
                label=DEFAULT_WORKSPACE_LABEL,
                is_active=True,
            )
            self._session.add(seeded)
            await self._session.commit()
            await self._session.refresh(seeded)
            return seeded.id

        active = next((row for row in rows if row.is_active), None)
        if active is not None:
            return active.id

        fallback = rows[0]
        await self._session.execute(update(SwitchboardWorkspace).values(is_active=False))
        fallback.is_active = True
        await self._session.commit()
        await self._session.refresh(fallback)
        return fallback.id

    async def _repair_projects_workspace_scope(self) -> None:
        workspace_id = await self._resolve_active_workspace_id()
        await self._session.execute(text("ALTER TABLE projects ADD COLUMN workspace_id VARCHAR"))
        await self._session.execute(
            text("UPDATE projects SET workspace_id = :workspace_id WHERE workspace_id IS NULL"),
            {"workspace_id": workspace_id},
        )
        await self._session.commit()

    async def _repair_projects_url_column(self) -> None:
        await self._session.execute(text("ALTER TABLE projects ADD COLUMN project_url TEXT"))
        await self._session.commit()

    async def _repair_projects_github_repo_url_column(self) -> None:
        await self._session.execute(text("ALTER TABLE projects ADD COLUMN github_repo_url TEXT"))
        await self._session.commit()


def _detect_conflict_field(exc: IntegrityError) -> Literal["name", "path", "unknown"]:
    message = str(getattr(exc, "orig", exc)).lower()
    if (
        "projects.name" in message
        or "(name)" in message
        or "uq_projects_workspace_name" in message
        or "(workspace_id, name)" in message
    ):
        return "name"
    if (
        "projects.project_path" in message
        or "(project_path)" in message
        or "uq_projects_workspace_path" in message
        or "(workspace_id, project_path)" in message
    ):
        return "path"
    return "unknown"


def _is_missing_projects_table_error(exc: OperationalError) -> bool:
    message = str(getattr(exc, "orig", exc)).lower()
    return (
        "no such table: projects" in message
        or ('relation "projects" does not exist' in message)
        or ("relation 'projects' does not exist" in message)
    )


def _is_missing_projects_workspace_scope_error(exc: OperationalError) -> bool:
    message = str(getattr(exc, "orig", exc)).lower()
    return (
        "no such column: projects.workspace_id" in message
        or 'column "workspace_id" of relation "projects" does not exist' in message
        or "unknown column 'workspace_id' in 'field list'" in message
    )


def _is_missing_projects_url_column_error(exc: OperationalError) -> bool:
    message = str(getattr(exc, "orig", exc)).lower()
    return (
        "no such column: projects.project_url" in message
        or 'column "project_url" of relation "projects" does not exist' in message
        or "unknown column 'project_url' in 'field list'" in message
    )


def _is_missing_projects_github_repo_url_column_error(exc: OperationalError) -> bool:
    message = str(getattr(exc, "orig", exc)).lower()
    return (
        "no such column: projects.github_repo_url" in message
        or 'column "github_repo_url" of relation "projects" does not exist' in message
        or "unknown column 'github_repo_url' in 'field list'" in message
    )


def _is_missing_workspaces_table_error(exc: OperationalError) -> bool:
    message = str(getattr(exc, "orig", exc)).lower()
    return (
        "no such table: switchboard_workspaces" in message
        or ('relation "switchboard_workspaces" does not exist' in message)
        or ("relation 'switchboard_workspaces' does not exist" in message)
    )
