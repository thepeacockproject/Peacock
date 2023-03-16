# Candle

Lighting the way through the new era of Hitman.

Candle is the subsystem for handling Challenges, Progression, and XP.

## Credits

Thanks to Moo for the name suggestion.

## Loading challenges

Challenge data reside in files in `contractdata` ending in `_CHALLENGES.json`. When building, the `packResources` function in `buildTasks.mjs` will take all such files and pack them into files in the `resources/challenges` folder.

Then, when the server starts, challenge data is loaded from the files in the `resources/challenges` folder into the memory, via the `_loadResources` function in `controller.ts`. It calls the `_handleChallengeResources` function that in turn calls `challengeService.registerGroup` and `challengeService.registerChallenge` to register the challenge group and the respective challenges.

These two registration functions initialize two data structures, `groups: Map<string, Map<string, SavedChallengeGroup>>`, which maps `parentLocationId`s to `Map`s of `groupId`s to `SavedChallengeGroup` objects for this group of this parent location, and `groupContents: Map<string, Map<string, Set<string>>>`, which maps `parentLocationId`s to `Map`s of `groupId`s to `Set`s of challenge Ids in this group of this parent location. All subsequent operations on challenges write to or read from these two `Map`s.
