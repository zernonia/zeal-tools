/**
 * The 250 words the tests are built from.
 *
 * Written out by hand for this tool: common English function words and
 * everyday vocabulary, the kind that make up most running text. Only lower
 * case and letters — capitals and punctuation are added by the generator when
 * asked for, so the plain test stays a test of the words themselves.
 *
 * Kept as one block of text, ten to a line, because it is easier to read
 * and check by eye than 250 quoted strings.
 *
 * Deliberately no passages from books or articles: a quotation would be
 * someone else's text, and a fixed passage rewards memorising it.
 */
export const WORDS: readonly string[] = `
the be to of and a in that have it
for not on with he as you do at this
but his by from they we say her she or
an will my one all would there their what so
up out if about who get which go me when
make can like time no just him know take people
into year your good some could them see other than
then now look only come its over think also back
after use two how our work first well way even
new want because any these give day most us is
are was were been has had did said made went
very here where why much many more such own same
long little great old big high small large next early
young last right left few public bad able home world
life hand part child eye woman man place week case
point number group problem fact house water room mother area
money story night study book word school family state country
question side kind head line end name city car friend
idea body face door town road tree food light paper
find tell ask seem feel try leave call keep let
begin help talk turn start show hear play run move
live hold bring write stand learn change lead read open
walk win grow meet pay send build stay fall cut
never always often again still ever together around off down
under between through before while during without each every both
`.trim().split(/\s+/)
