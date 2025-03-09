# Escalation Guidelines

This document outlines the expected guidelines for custom Peacock escalations
which allow for an improved user experience and consistency among official
and Peacock escalations.

The guidelines:

- Use localised strings for anything that isn't automatically localised by the game.
    - Try not to "re-localise" strings that are already in the game and available to us e.g. "No Disguise Change"
- Try to "group" objectives together i.e. eliminations and retrieval objectives should be grouped separately (e.g. Target, Target, Target, Retrieval, Retrieval).
- **Always** try to use `GroupObjectiveDisplayOrder` and keep objectives in the same order between levels (unless they've changed and need to be marked as new).
- Use `IsNew` on any new objectives.
    - New objectives should be placed **before** old objectives in their groups.
    - The first level **should not** have any objectives marked as new.
- Gamechangers **should always be placed to the right of main objectives**.
- Try to have kill objectives first, before any other objectives.
- Try to not put long strings for `BriefingName` this is so they show nicely in the tall tiles with scrolling/being truncated.
- Don't use `LongBriefingText` unless it's absolutely required. It can be left out and it'll default to `BriefingText`.
- Peacock escalations should be added **first** in locations **and in `EscalationCodenames.json`**.
- If no conditions are included for a target, use the game to localise it (`UI_CONTRACT_GENERAL_OBJ_KILL`).
    - If conditions are included, include them in the HUD string and **LOCALISE IT**!
- For `(Long)BriefingText`, try to use proper grammar (i.e. ending with a full stop).
