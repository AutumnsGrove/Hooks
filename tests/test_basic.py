"""Basic test to ensure test suite is working."""


def test_project_structure():
    """Test that basic project structure exists."""
    from pathlib import Path

    project_root = Path(__file__).parent.parent

    # Check that key directories exist
    assert (project_root / "src").exists()
    assert (project_root / "src" / "hooks").exists()
    assert (project_root / "tests").exists()

    # Check that key files exist
    assert (project_root / "pyproject.toml").exists()
    assert (project_root / "README.md").exists()
    assert (project_root / "CLAUDE.md").exists()


def test_imports():
    """Test that project imports work."""
    import src  # noqa: F401
    import src.hooks  # noqa: F401

    # If imports work, test passes
    assert True
