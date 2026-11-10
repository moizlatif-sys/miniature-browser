/**
 * The seeded miniature web. Everything here is invented.
 *
 * Link graph (→ = links to, ✗ = address that was never published):
 *
 *   start.zz      → tidepool, sourdough, garden, mapmaker, moth, teapot, night-radio
 *   tidepool.zz   → lighthouse, driftwood, moth, ✗ seaglass.zz
 *   lighthouse.zz → night-radio, mapmaker, tidepool
 *   night-radio.zz→ sourdough, moth, lighthouse, ✗ radio-schedule.zz
 *   sourdough.zz  → garden#beds, teapot, bookbinding, ✗ rye.zz
 *   garden.zz     → moth, sourdough, #compost, #beds
 *   moth.zz       → garden#compost, night-radio, lighthouse
 *   mapmaker.zz   → lighthouse, driftwood, bookbinding, ✗ old-maps.zz, an external link
 *   driftwood.zz  → tidepool, mapmaker, ✗ seaglass.zz
 *   bookbinding.zz→ mapmaker, teapot, sourdough
 *   teapot.zz     → bookbinding, sourdough, start
 *
 * A four-deep trail with no turning back:
 *   start → tidepool → lighthouse → night-radio → sourdough → garden → moth
 */

export interface SeedPerson {
  key: string;
  name: string;
}

export interface SeedSite {
  key: string;
  address: string;
  title: string;
  author: string; // SeedPerson.key
  html: string;
}

export type SeedMethod = 'typed' | 'link' | 'back' | 'forward' | 'history' | 'search_result';

/** [minutes after the seed epoch, address, how they got there] */
export type SeedStep = [number, string, SeedMethod];

/** Fixed point in time the seeded hour of history is measured from. */
export const SEED_EPOCH = new Date('2026-11-01T18:00:00.000Z');

export const PEOPLE: SeedPerson[] = [
  { key: 'wren', name: 'Wren Okafor' },
  { key: 'tomas', name: 'Tomas Reyes' },
  { key: 'ines', name: 'Ines Varga' },
  { key: 'priya', name: 'Priya Nandakumar' },
  { key: 'hal', name: 'Hal Brennan' },
  { key: 'juno', name: 'Juno Park' },
];

export const SITES: SeedSite[] = [
  {
    key: 'start',
    address: 'start.zz',
    title: 'Start Here: A Directory of the Small Web',
    author: 'juno',
    html: `
<h1>Start here</h1>
<p>This is a hand-kept list of the pages I return to. Nobody pays for any of them,
nobody optimises them, and most of them were written by one person late at night.
That is the point.</p>
<h2>By the water</h2>
<ul>
  <li><a href="tidepool.zz">The Tidepool Log</a> — a weekly count of what lives between the tides.</li>
  <li><a href="night-radio.zz">Night Radio</a> — notes from someone who listens to the dark.</li>
</ul>
<h2>Kitchen and garden</h2>
<ul>
  <li><a href="sourdough.zz">Slow Bread</a> — patient baking, with opinions.</li>
  <li><a href="garden.zz">A Small Allotment</a> — four beds, one compost heap, endless slugs.</li>
  <li><a href="teapot.zz">The Teapot Index</a> — exactly what it sounds like.</li>
</ul>
<h2>Curiosities</h2>
<ul>
  <li><a href="mapmaker.zz">The Amateur Mapmaker</a> — maps of places too small to map.</li>
  <li><a href="moth.zz">Moths of the Back Porch</a> — who comes to the lamp after midnight.</li>
</ul>
<p>If you write a page of your own, publish it and tell me. I read everything.</p>
`,
  },
  {
    key: 'tidepool',
    address: 'tidepool.zz',
    title: 'The Tidepool Log',
    author: 'wren',
    html: `
<h1>The Tidepool Log</h1>
<p>Every Sunday at low tide I walk out to the flat rocks below the
<a href="lighthouse.zz">old light</a> and count what I find. I have done this for six
years. The counts are not science, exactly, but they are honest, and over six years
honest numbers start to say things.</p>
<h2>This week</h2>
<p>Forty-one periwinkles in the long pool, which is low for November. Two shore crabs,
both small and both furious. A single beadlet anemone that has lived in the same crack
since my first year; I have started to think of it as the landlord. The water was
cold enough that my fingers stopped working after twenty minutes.</p>
<blockquote>The tide does not care whether you have counted. It comes back regardless,
and you either have your notebook dry or you do not.</blockquote>
<h2>Things the sea leaves behind</h2>
<p>Between counts I pick up what the tide brings in. The good pieces go to my friend
who keeps <a href="driftwood.zz">a collection of found things</a>. I once kept a jar of
sea glass and wrote about it at <a href="seaglass.zz">seaglass.zz</a>, but I took that
page down years ago and never put it back.</p>
<p>On warm evenings the rocks are covered in small brown moths resting in the salt
spray. I did not know what they were until I found
<a href="moth.zz">the back porch moth page</a>.</p>
`,
  },
  {
    key: 'lighthouse',
    address: 'lighthouse.zz',
    title: "Keeper's Notes from Gull Point Light",
    author: 'wren',
    html: `
<h1>Keeper's Notes from Gull Point Light</h1>
<p>Gull Point Light has not had a keeper since 1974. The lamp is automatic now, a sealed
unit swapped out every few years by a crew who arrive by boat and leave the same day.
I am not the keeper. I am the person who lives in the keeper's cottage and has the key
to the tower, which is close enough for a page like this.</p>
<h2>The lamp</h2>
<p>The light turns once every twelve seconds. On clear nights you can see the beam
sweep the water for miles; on foggy nights the beam goes nowhere and the foghorn
does the work instead. Ships do not really need either any more. The light stays on
because turning it off would feel like giving up on something.</p>
<h2>Night listening</h2>
<p>The tower is the best place on the coast for a radio. Up there, on the iron gallery,
I can pick up stations from three countries and some that do not seem to belong to any
country at all. A listener inland keeps a much better log than I do at
<a href="night-radio.zz">Night Radio</a>.</p>
<p>Someone once sent me <a href="mapmaker.zz">a hand-drawn map of the point</a> with the
tower marked as a tiny star. It hangs by the stairs. Below the tower, at low water,
are <a href="tidepool.zz">the pools I count every week</a>.</p>
`,
  },
  {
    key: 'driftwood',
    address: 'driftwood.zz',
    title: 'Driftwood & Other Found Things',
    author: 'wren',
    html: `
<h1>Driftwood &amp; Other Found Things</h1>
<p>A catalogue of objects the sea returned. Each has a number, a date, and a guess at
where it came from. The guesses are usually wrong.</p>
<table>
  <thead><tr><th>No.</th><th>Object</th><th>Found</th><th>Best guess</th></tr></thead>
  <tbody>
    <tr><td>112</td><td>Blue fishing float, cracked</td><td>March</td><td>A trawler, far north</td></tr>
    <tr><td>113</td><td>Plank with a painted letter K</td><td>April</td><td>A boat named K-something</td></tr>
    <tr><td>114</td><td>Child's plastic spade</td><td>June</td><td>Every beach on earth</td></tr>
    <tr><td>115</td><td>Bleached branch, shaped like a hand</td><td>August</td><td>A river, then the sea</td></tr>
  </tbody>
</table>
<p>Most of these came from the pools described in <a href="tidepool.zz">the Tidepool Log</a>.
The sea glass used to have its own page at <a href="seaglass.zz">seaglass.zz</a>, but that
address has been empty for a long time.</p>
<p>A mapmaker friend is plotting where every object was found, which you can follow at
<a href="mapmaker.zz">The Amateur Mapmaker</a>.</p>
`,
  },
  {
    key: 'sourdough',
    address: 'sourdough.zz',
    title: 'Slow Bread',
    author: 'tomas',
    html: `
<h1>Slow Bread</h1>
<p>My starter is eleven years old and lives in a jar on top of the fridge, where it is
warm. I feed it flour and water every morning before I make coffee. Most of baking is
waiting, and most of the waiting is done by the dough.</p>
<h2>The method, roughly</h2>
<ol>
  <li>Mix flour and water and leave it alone for an hour.</li>
  <li>Add the starter and salt, squeeze it through your fingers until it feels like one thing.</li>
  <li>Every half hour, stretch and fold the dough four times. Do this four times.</li>
  <li>Shape it, put it in a basket, and leave it in the cold overnight.</li>
  <li>Bake it hot, in a heavy pot, with the lid on for the first twenty minutes.</li>
</ol>
<p>The fold is the whole trick. You are not kneading; you are teaching the dough to hold
itself up. I learned to fold from a bookbinder, of all people, whose
<a href="bookbinding.zz">notes on folding paper</a> are oddly useful in a kitchen.</p>
<h2>What goes with it</h2>
<p>Butter, obviously. Tomatoes from <a href="garden.zz#beds">the allotment beds</a> in
August. A pot of something strong from <a href="teapot.zz">the Teapot Index</a>.</p>
<p>I promised a rye page years ago at <a href="rye.zz">rye.zz</a>. I have not written it.
Rye is hard.</p>
<pre><code>starter   100 g
water     350 g
flour     500 g
salt       10 g</code></pre>
`,
  },
  {
    key: 'night-radio',
    address: 'night-radio.zz',
    title: 'Night Radio',
    author: 'tomas',
    html: `
<h1>Night Radio</h1>
<p>I bake bread in the morning and listen to the radio at night. Between midnight and
three, the airwaves change. Stations that are drowned out in daylight drift in from very
far away: weather reports in languages I do not speak, slow music, and long stretches of
someone simply reading numbers aloud.</p>
<h2>Last night's log</h2>
<pre><code>00:12  low hum, then a voice reading a shipping forecast
00:40  piano, very faint, fading in and out with the weather
01:15  someone counting in fives, a pause, then counting again
02:03  nothing at all — a perfect, empty carrier</code></pre>
<p>The best listening post I know is the iron gallery at
<a href="lighthouse.zz">Gull Point Light</a>. The keeper there lets me climb up when the
night is clear.</p>
<p>I tried to keep a proper schedule of the numbers stations at
<a href="radio-schedule.zz">radio-schedule.zz</a> but never published it.</p>
<p>While I listen, moths gather on the window, drawn to the glow of the dial. There is a
whole page about <a href="moth.zz">the moths that come to the light</a>. In the morning
there is always <a href="sourdough.zz">bread to shape</a>.</p>
`,
  },
  {
    key: 'garden',
    address: 'garden.zz',
    title: 'A Small Allotment',
    author: 'ines',
    html: `
<h1>A Small Allotment</h1>
<p>Plot 14 is four raised beds, a water butt, a compost heap, and a shed that leans
slightly more each year. Jump to <a href="#beds">the beds</a> or
<a href="#compost">the compost</a>.</p>
<h2 id="beds">The beds</h2>
<p>Bed one is tomatoes and basil, because they like each other. Bed two is beans,
climbing up hazel poles I cut myself. Bed three is the experiment bed, which this year
held a row of black radishes that tasted like pepper and soil. Bed four is
strawberries, which mostly feed the blackbirds.</p>
<p>The tomatoes go to a neighbour who bakes; you can see what happens to them at
<a href="sourdough.zz">Slow Bread</a>.</p>
<p>Slugs remain undefeated. I go out at night with a torch and pick them off the
lettuces, and while I am out there the moths come to the torch. One evening I counted
eleven kinds. Someone else counts them properly at <a href="moth.zz">the back porch</a>.</p>
<h2 id="compost">The compost</h2>
<p>The compost heap is the most important thing on the plot and the least
photographed. Green layers, brown layers, turn it every fortnight, and keep it as damp
as a wrung-out sponge. In winter it steams in the cold air like a small, patient animal.</p>
<p>Things that go in: peelings, coffee grounds, tea leaves, torn cardboard, grass.
Things that do not: cooked food, cat litter, anything shiny.</p>
<p style="text-align: center; font-style: italic;">The soil you make is the only soil you keep.</p>
`,
  },
  {
    key: 'mapmaker',
    address: 'mapmaker.zz',
    title: 'The Amateur Mapmaker',
    author: 'ines',
    html: `
<h1>The Amateur Mapmaker</h1>
<p>I draw maps of places that are too small to appear on real maps: a single beach, an
allotment, the inside of a friend's kitchen. A good small map leaves things out on
purpose. The hard part is not drawing; it is deciding what to fold away.</p>
<h2>Current projects</h2>
<ul>
  <li>Gull Point at low tide, with every rock pool numbered. The keeper at
      <a href="lighthouse.zz">the lighthouse</a> checks my soundings.</li>
  <li>A map of where every object in <a href="driftwood.zz">the driftwood catalogue</a>
      was found. So far it is mostly one beach.</li>
</ul>
<h2>Folding</h2>
<p>A paper map is only as good as its fold. I fold mine in a concertina, then in half,
so a walker can open one panel at a time in the wind. A bookbinder taught me the
technique; their <a href="bookbinding.zz">notes on folds and signatures</a> are the
best I have found.</p>
<p>My older maps used to live at <a href="old-maps.zz">old-maps.zz</a>. I lost the files.
There is also a big public mapping project out on the real internet at
<a href="https://maps.example.com">maps.example.com</a>, but that is not part of this web.</p>
`,
  },
  {
    key: 'moth',
    address: 'moth.zz',
    title: 'Moths of the Back Porch',
    author: 'priya',
    html: `
<h1>Moths of the Back Porch</h1>
<p>I leave the porch lamp on and a white sheet hanging on the line. After midnight, the
moths arrive. Most people think of moths as dull and brown. Most people have not looked
closely at a moth.</p>
<h2>Regular visitors</h2>
<ul>
  <li><strong>Large yellow underwing</strong> — dull on top, then a flash of orange when it flies.</li>
  <li><strong>Angle shades</strong> — looks exactly like a crumpled dead leaf, on purpose.</li>
  <li><strong>Elephant hawk-moth</strong> — pink and olive, like a sweet from a jar.</li>
  <li><strong>Feathered thorn</strong> — a November moth, out when everything else has stopped.</li>
</ul>
<h2>Why the light?</h2>
<p>Nobody is completely sure why moths circle a lamp. The best current idea is that
they keep the brightest thing in the sky above their backs, and a lamp confuses them
into turning endlessly around it. I switch the lamp off at three so they can leave.</p>
<p>Moth caterpillars love a good compost heap; there is a fine one described at
<a href="garden.zz#compost">the allotment</a>. A radio listener writes about moths on the
window at <a href="night-radio.zz">Night Radio</a>, and the keeper at
<a href="lighthouse.zz">Gull Point</a> says the lamp there draws hundreds on still nights.</p>
`,
  },
  {
    key: 'bookbinding',
    address: 'bookbinding.zz',
    title: 'Notes on Binding Books by Hand',
    author: 'hal',
    html: `
<h1>Notes on Binding Books by Hand</h1>
<p>A book is a stack of folded sheets sewn together. Everything else — covers, glue,
gold lettering — is decoration. If you can fold paper cleanly and sew a straight line,
you can bind a book.</p>
<h2>Folds and signatures</h2>
<p>Fold a large sheet in half and you have a folio: four pages. Fold it again and you
have a quarto: eight pages. Fold it once more and you have an octavo: sixteen pages.
Each folded bundle is called a signature. Fold with the grain of the paper, or the
spine will fight you for the rest of its life.</p>
<p>The same thinking applies to <a href="mapmaker.zz">folding maps</a> and, I am told,
to <a href="sourdough.zz">folding bread dough</a>, although I have never managed a decent
loaf.</p>
<h2>Sewing</h2>
<p>I use linen thread, waxed, and a simple kettle stitch at the head and tail. The
first book takes an afternoon. The tenth takes an hour. The hundredth still takes an
hour, but you stop minding.</p>
<p>I bind best with a pot of tea at my elbow, catalogued at length on
<a href="teapot.zz">the Teapot Index</a>.</p>
`,
  },
  {
    key: 'teapot',
    address: 'teapot.zz',
    title: 'The Teapot Index',
    author: 'hal',
    html: `
<h1>The Teapot Index</h1>
<p>Every teapot I own, rated on pour, heat, and temperament. A teapot with a bad pour
will drip on the table forever, and no amount of affection fixes it.</p>
<table>
  <thead><tr><th>Teapot</th><th>Pour</th><th>Heat</th><th>Temperament</th></tr></thead>
  <tbody>
    <tr><td>Brown stoneware, four cups</td><td>Clean</td><td>Excellent</td><td>Reliable as the tide</td></tr>
    <tr><td>Glass, with infuser</td><td>Dribbles</td><td>Poor</td><td>Pretty, useless</td></tr>
    <tr><td>Cast iron, small</td><td>Clean</td><td>Excellent</td><td>Heavy, sulks if left wet</td></tr>
    <tr><td>Novelty cottage</td><td>Floods</td><td>Fair</td><td>Embarrassing</td></tr>
  </tbody>
</table>
<p>The brown stoneware pot comes to the bench whenever I am
<a href="bookbinding.zz">binding a book</a>. It also goes well with toast from
<a href="sourdough.zz">a proper loaf</a>.</p>
<p>Lost? Go back to <a href="start.zz">the directory</a>.</p>
`,
  },
];

/**
 * Roughly one hour of browsing. Times are minutes after SEED_EPOCH.
 * Juno has been nearly everywhere; Tomas and Ines walk long trails;
 * Wren keeps going back to the same few pages.
 */
export const HISTORY: Record<string, SeedStep[]> = {
  juno: [
    [0, 'start.zz', 'typed'],
    [2, 'tidepool.zz', 'link'],
    [5, 'lighthouse.zz', 'link'],
    [8, 'night-radio.zz', 'link'],
    [11, 'radio-schedule.zz', 'link'],
    [11.5, 'night-radio.zz', 'back'],
    [14, 'sourdough.zz', 'link'],
    [18, 'garden.zz', 'link'],
    [22, 'moth.zz', 'link'],
    [26, 'start.zz', 'typed'],
    [27, 'mapmaker.zz', 'link'],
    [31, 'driftwood.zz', 'link'],
    [34, 'bookbinding.zz', 'search_result'],
    [38, 'teapot.zz', 'link'],
    [41, 'start.zz', 'link'],
    [43, 'garden.zz', 'history'],
    [50, 'teapot.zz', 'typed'],
  ],
  wren: [
    [3, 'tidepool.zz', 'typed'],
    [7, 'driftwood.zz', 'link'],
    [9, 'seaglass.zz', 'link'],
    [9.5, 'driftwood.zz', 'back'],
    [12, 'tidepool.zz', 'link'],
    [24, 'tidepool.zz', 'typed'],
    [25, 'lighthouse.zz', 'link'],
    [40, 'tidepool.zz', 'history'],
    [55, 'tidepool.zz', 'typed'],
  ],
  tomas: [
    [1, 'sourdough.zz', 'typed'],
    [6, 'bookbinding.zz', 'link'],
    [9, 'mapmaker.zz', 'link'],
    [13, 'lighthouse.zz', 'link'],
    [16, 'night-radio.zz', 'link'],
    [20, 'moth.zz', 'link'],
    [23, 'garden.zz', 'link'],
    [28, 'sourdough.zz', 'link'],
    [30, 'rye.zz', 'link'],
    [45, 'night-radio.zz', 'typed'],
  ],
  ines: [
    [10, 'garden.zz', 'typed'],
    [12, 'moth.zz', 'link'],
    [15, 'garden.zz', 'link'],
    [19, 'sourdough.zz', 'link'],
    [21, 'teapot.zz', 'link'],
    [25, 'bookbinding.zz', 'link'],
    [29, 'mapmaker.zz', 'link'],
    [33, 'old-maps.zz', 'link'],
    [33.5, 'mapmaker.zz', 'back'],
    [37, 'driftwood.zz', 'link'],
  ],
  priya: [
    [20, 'moth.zz', 'typed'],
    [32, 'garden.zz', 'search_result'],
    [35, 'moth.zz', 'back'],
    [52, 'moth.zz', 'typed'],
  ],
  hal: [
    [44, 'teapot.zz', 'typed'],
    [47, 'bookbinding.zz', 'link'],
    [58, 'teapot.zz', 'typed'],
  ],
};
