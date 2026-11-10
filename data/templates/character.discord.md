{{! The server's own OC format. Paste the output straight into the channel.                 }}
{{! Note the two Affiliation lines: the Personal one is `affiliation`, the Sorcerer Profile  }}
{{! one is `faction` — they answer different questions, so the record keeps them apart.      }}
⋙《 {{name}}{{#nicknames}} ({{nicknames}}){{/nicknames}} 》

«𝐆𝐞𝐧𝐞𝐫𝐚𝐥»
Name: {{name}}
{{#nicknames}}Nicknames: {{nicknames}}
{{/nicknames}}{{#gender}}Gender: {{gender}}
{{/gender}}{{#race}}Race: {{race}}
{{/race}}{{#subdivision}}Subdivision: {{subdivision}}
{{/subdivision}}{{#age}}Age: {{age}}
{{/age}}{{#dateOfBirth}}Date of Birth: {{dateOfBirth}}
{{/dateOfBirth}}{{#sexuality}}Sexuality: {{sexuality}}
{{/sexuality}}

«𝐀𝐩𝐩𝐞𝐚𝐫𝐚𝐧𝐜𝐞»
{{#nationality}}Nationality: {{nationality}}
{{/nationality}}{{#ethnicity}}Ethnicity: {{ethnicity}}
{{/ethnicity}}{{#hairColour}}Hair Colour: {{hairColour}}
{{/hairColour}}{{#eyeColour}}Eye Colour: {{eyeColour}}
{{/eyeColour}}{{#height}}Height: {{height}}
{{/height}}{{#appearance}}
{{appearance}}
{{/appearance}}

«𝐏𝐞𝐫𝐬𝐨𝐧𝐚𝐥»
{{#affiliation}}Affiliation: {{affiliation}}
{{/affiliation}}{{#occupation}}Occupation: {{occupation}}
{{/occupation}}{{#hobbies}}Hobbies: {{hobbies}}
{{/hobbies}}{{#likes}}Likes: {{likes}}
{{/likes}}{{#dislikes}}Dislikes: {{dislikes}}
{{/dislikes}}{{#personality}}
{{personality}}
{{/personality}}{{#background}}
{{background}}
{{/background}}

«𝐒𝐨𝐫𝐜𝐞𝐫𝐞𝐫 𝐏𝐫𝐨𝐟𝐢𝐥𝐞»
Grade: {{grade}}
{{#faction}}Affiliation: {{faction}}
{{/faction}}{{#clan}}Clan: {{clan}}
{{/clan}}{{#anyClanBonus}}Clan Bonus: {{clanBonus}}
{{/anyClanBonus}}{{#anyMutations}}Mutations:
{{/anyMutations}}{{#mutations}}- {{.}}
{{/mutations}}{{#techniqueName}}Innate Technique: {{techniqueName}}
{{/techniqueName}}{{#techniqueDescription}}{{techniqueDescription}}
{{/techniqueDescription}}{{#anyExtensions}}Extensions:
{{/anyExtensions}}{{#extensions}}- {{.}}
{{/extensions}}{{#maximum}}Maximum Technique: {{maximum}}
{{/maximum}}{{#domain}}Domain Expansion: {{domain}}
{{/domain}}{{#anyArts}}Arts:
{{/anyArts}}{{#arts}}- {{.}}
{{/arts}}{{#ceApplications}}CE Applications: {{ceApplications}}
{{/ceApplications}}{{#reverseCursedTechnique}}Reverse Cursed Technique: {{reverseCursedTechnique}}
{{/reverseCursedTechnique}}{{#simpleDomain}}Simple Domain: Yes
{{/simpleDomain}}{{#blackFlash}}Black Flash: {{blackFlash}}
{{/blackFlash}}{{#heavenlyRestriction}}Heavenly Restriction: {{heavenlyRestriction}}
{{/heavenlyRestriction}}{{#arsenal}}Arsenal: {{arsenal}}
{{/arsenal}}{{#anyCursedTools}}Cursed Tools:
{{/anyCursedTools}}{{#cursedTools}}- {{.}}
{{/cursedTools}}{{#anyTraits}}Traits:
{{/anyTraits}}{{#traits}}- {{.}}
{{/traits}}{{#anyDefects}}Defects:
{{/anyDefects}}{{#defects}}- {{.}}
{{/defects}}Art Slots: {{artSlots}}
Trait Slots: {{traitSlots}}
Potential: {{#potential}}{{potential}}{{/potential}}{{^potential}}N/A{{/potential}}
{{#anyAwakenings}}Awakenings:
{{/anyAwakenings}}{{#awakenings}}- {{.}}
{{/awakenings}}{{#anyFeats}}Feats:
{{/anyFeats}}{{#feats}}- {{.}}
{{/feats}}{{#mastery}}Mastery: {{mastery}}
{{/mastery}}{{#cursedRating}}Cursed Rating: {{cursedRating}}
{{/cursedRating}}

«𝐒𝐭𝐚𝐭𝐬»
CE Output: {{ce-output}}
CE Control: {{ce-control}}
CE Reserves: {{ceReserves}}
CE Efficiency: {{ce-efficiency}}
Perception: {{perception}}
Strength: {{strength}}
Speed: {{speed}}
Fortitude: {{fortitude}}

{{#anyMissions}}«𝐌𝐢𝐬𝐬𝐢𝐨𝐧 𝐋𝐨𝐠»
{{/anyMissions}}{{#missions}}- {{.}}
{{/missions}}

«𝐁𝐨𝐧𝐮𝐬»
{{#themeSong}}Theme Song: {{themeSong}}
{{/themeSong}}{{#faceClaim}}Face Claim: {{faceClaim}}
{{/faceClaim}}
{{#notes}}||{{notes}}||
{{/notes}}
