# User Profiles

This file serves to document the various changes made to user profiles.

The default user profile for before the versioning system can be found at the following links for
[H2/3](https://github.com/thepeacockproject/Peacock/blob/2a7f41b1c0160191ada0990542c426010b663f29/static/UserDefault.json)
and [H2016](https://github.com/thepeacockproject/Peacock/blob/2a7f41b1c0160191ada0990542c426010b663f29/static/LegacyUserDefault.json).

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
-   `u.Extensions.progression.Unlockables` has been removed.
