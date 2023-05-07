# User Profiles

This file serves to document the various changes made to user profiles.

The default user profile for before the versioning system can be found at the following links for
[H2/3](https://google.com) and [H2016](https://google.com).

## Notes about the versioning system

If a version is added **ENSURE** that you accordingly update the `updateUserProfile`
function in `components/utils.ts`. There are comments in that function to guide you.
If you are unsure, ask.

## Version 1

Version 1 introduced the profile versioning system. The changes are:

-   Removed unused keys (non location parents) in `u.Extensions.progression.Locations`.
-   Upper-cased keys in `u.Extensions.progression.Locations` to fit with the rest of Peacock.
-   Added subpackages to certain locations in `u.Extensions.progression.Locations`:
    -   Legacy profiles now have `normal` and `pro1`.
    -   Sniper locations now have their unlockables contained inside the location.
-   Unused properties were removed from locations in `u.Extensions.progression.Locations`.
    -   It is worth noting that this was only done in the default profile, existing profiles are not updated with this change.
-   `u.Extensions.progression.Unlockables` has been removed.
