# 1) Make Git ignore submodule dirtiness
#
# This improves `git status` performance when you have large submodules like
# https://github.com/linuxhw/EDID (which is ~170,000 files and 1.5GB).
#
# By default, `git status` will often scan into submodules to determine if
# they are dirty. Tell Git to stop caring.
git config -f .gitmodules submodule.submodules/linuxhw-edid.ignore all
git config -f .gitmodules submodule.submodules/hwdata-edid.ignore all

git submodule sync --recursive
git submodule foreach --recursive 'git config status.showUntrackedFiles no'

# 2) Stop automatic submodule updates on pull/checkout
#
# Even with recurse off, some workflows still trigger updates.
# Disable update behavior explicitly:
git config submodule.submodules/linuxhw-edid.update none
git config submodule.submodules/hwdata-edid.update none
# This prevents `git submodule update` from doing anything for those entries
# unless you override it.
#
# When you do want to move them forward later, you can temporarily override:
#
# git -c submodule.submodules/linuxhw-edid.update=checkout submodule update --init submodules/linuxhw-edid

# 6) Sanity checks: confirm whats actually slow
#
# Run these to identify if it's Git scanning the submodule worktrees vs something else:
#
# - `git status -uno `(if this is fast, untracked scanning was the issue)
# - `git -c status.submoduleSummary=false status` (tests submodule status overhead)
# - `GIT_TRACE_PERFORMANCE=1 git status` (shows where time is going)
#
# If `git status -uno`` becomes fast after `ignore = all``, you are basically
# done on the Git side.

git status -uno
echo
git -c status.submoduleSummary=false status
echo
GIT_TRACE_PERFORMANCE=1 git status
