{{! The server's own posting format. Paste the output straight into the channel.          }}
{{! Keys come from domain/export-context.ts; edit this file freely, it is only a default.  }}
⋙《 {{name}} 》

{{#hostLine}}Hosts : {{hostLine}}{{/hostLine}}

```
Mission Type: {{missionType}}
Recommended Grade: {{#recommendedGrade}}{{recommendedGrade}}{{/recommendedGrade}}{{^recommendedGrade}}{{grade}} and Below{{/recommendedGrade}}
{{#faction}}Open To: {{faction}}
{{/faction}}
{{#location}}Location: {{location}}
{{/location}}{{#client}}Client: {{client}}
{{/client}}
{{briefing}}
```

{{#anyObjectives}}## 𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤𝖲

{{/anyObjectives}}{{#objectives}}- {{.}}
{{/objectives}}

{{#anyComplications}}## 𝖢𝖮𝖬𝖯𝖫𝖨𝖢𝖠𝖳𝖨𝖮𝖭𝖲

{{/anyComplications}}{{#complications}}- {{.}}
{{/complications}}

{{#anyRewards}}[ 𝖱𝖤𝖶𝖠𝖱𝖣𝖲 ]

{{/anyRewards}}{{#rewards}}- {{.}}
{{/rewards}}{{#payout}}- Client fee: {{payout}}
{{/payout}}

{{#anyObjectiveRewards}}[ 𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤 𝖤𝖷𝖢𝖫𝖴𝖲𝖨𝖵𝖤 ]

{{/anyObjectiveRewards}}{{#objectiveRewards}}- {{.}}
{{/objectiveRewards}}{{#anyObjectiveRewards}}
These rewards are only granted if all objectives are completed.
{{/anyObjectiveRewards}}

{{#anyMvpRewards}}[ 𝖬𝖵𝖯 𝖤𝖷𝖢𝖫𝖴𝖲𝖨𝖵𝖤 ]

{{/anyMvpRewards}}{{#mvpRewards}}- {{.}}
{{/mvpRewards}}{{#anyMvpRewards}}
The MVPs will be decided by referee at the end of the event. If the event is concluded early, no MVPs will be selected.
{{/anyMvpRewards}}

{{#slots}}Mission Slots: [{{slots}}]{{/slots}}

{{! Staff-facing, so it is spoilered with the rest of the GM lines. }}
{{#anyHostRewards}}||**Host payout**||
{{/anyHostRewards}}{{#hostRewards}}||{{.}}||
{{/hostRewards}}

{{! Everything below is for the GM and is not part of the posting. }}
{{#trueSituation}}||**Actually:** {{trueSituation}}||
{{/trueSituation}}{{#veil}}||**Veil:** {{veil}}||
{{/veil}}{{#support}}||**Support:** {{support}}||
{{/support}}{{#notes}}||**Notes:** {{notes}}||
{{/notes}}
