# {{name}}

*{{grade}} {{missionType}}{{#client}} · for {{client}}{{/client}}*

{{#recommendedGrade}}**Recommended grade:** {{recommendedGrade}}  {{/recommendedGrade}}
{{#faction}}**Open to:** {{faction}}  {{/faction}}
{{#hostLine}}**Hosts:** {{hostLine}}  {{/hostLine}}
{{#slots}}**Slots:** {{slots}}  {{/slots}}
{{#difficulty}}**Difficulty:** {{difficulty}}{{/difficulty}}

{{#location}}**Location:** {{location}}{{/location}}

## Briefing

{{briefing}}

{{#anyObjectives}}## Objectives

{{/anyObjectives}}{{#objectives}}- {{.}}
{{/objectives}}

## What is actually going on

{{trueSituation}}

{{#anyComplications}}## Complications

{{/anyComplications}}{{#complications}}- {{.}}
{{/complications}}

{{#anyRewards}}## Rewards

{{/anyRewards}}{{#rewards}}- {{.}}
{{/rewards}}
{{#anyObjectiveRewards}}**Objective exclusive** — only if every objective is completed.

{{/anyObjectiveRewards}}{{#objectiveRewards}}- {{.}}
{{/objectiveRewards}}
{{#anyMvpRewards}}**MVP exclusive** — the referee's call at the end; none if the event ends early.

{{/anyMvpRewards}}{{#mvpRewards}}- {{.}}
{{/mvpRewards}}
{{#anyHostRewards}}**Host payout**

{{/anyHostRewards}}{{#hostRewards}}- {{.}}
{{/hostRewards}}

{{#veil}}**Veil:** {{veil}}  {{/veil}}
{{#support}}**Support:** {{support}}  {{/support}}
{{#payout}}**Payout:** {{payout}}{{/payout}}

{{#notes}}## Notes

{{notes}}
{{/notes}}
{{#seed}}
---

*{{folder}}{{#visibility}} · visible to {{visibility}} and above{{/visibility}} · seed `{{seed}}`.*
{{/seed}}
