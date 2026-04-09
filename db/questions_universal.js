/**
 * Universal permit-test questions — applies to all states that don't have
 * state-specific question sets. Covers federally consistent rules and
 * general driving knowledge tested on every state's permit exam.
 *
 * Used for: NC(33), ND(34), OK(36), OR(37), PA(38), RI(39), SC(40),
 *   SD(41), TN(42), TX(43), UT(44), VT(45), VA(46), WA(47), WV(48),
 *   WI(49), WY(50)
 *
 * Format: [question, option_a, option_b, option_c, option_d, correct_answer, explanation, category]
 */

const UNIVERSAL_QUESTIONS = [
  // ── TRAFFIC SIGNS ────────────────────────────────────────────────────────────
  ['An octagonal (eight-sided) red sign always means:', 'Slow down and yield', 'Stop completely before the line or crosswalk', 'Road narrows ahead', 'No entry', 'B', 'The stop sign is the only octagonal traffic sign; a full stop is required before proceeding.', 'Signs'],
  ['A triangular sign with the point facing down means:', 'Stop ahead', 'Yield — slow down and give way to cross traffic', 'Speed limit ahead', 'School zone', 'B', 'The downward-pointing triangle is the universal yield sign shape.', 'Signs'],
  ['A diamond-shaped sign with a yellow background is:', 'A regulatory sign', 'A warning sign alerting you to a hazard ahead', 'A guide sign', 'A construction sign', 'B', 'Yellow diamond signs warn of potential hazards such as curves, merges, or animal crossings.', 'Signs'],
  ['A white rectangular sign with black letters indicates:', 'A warning', 'A regulatory rule you must obey', 'A service or destination', 'An advisory speed', 'B', 'White rectangular signs are regulatory — they state rules like speed limits or turn restrictions.', 'Signs'],
  ['A pennant-shaped yellow sign on the left side of the road means:', 'One-way traffic ahead', 'No passing zone begins here', 'School zone ahead', 'Lane ends ahead', 'B', 'The pennant (elongated triangle pointing right) marks the start of a no-passing zone.', 'Signs'],
  ['An orange sign in a work zone means:', 'Speed up to clear the area', 'Construction or maintenance is present; obey posted limits and flaggers', 'Road is closed permanently', 'No trucks allowed', 'B', 'Orange signs are exclusively used in work zones and require drivers to slow down and follow instructions.', 'Signs'],

  // ── TRAFFIC SIGNALS ──────────────────────────────────────────────────────────
  ['A steady red traffic light requires you to:', 'Slow down and proceed with caution', 'Stop completely and wait until green', 'Yield only if no traffic is present', 'Flash headlights and proceed', 'B', 'A red light means a full stop; you may turn right on red after stopping where permitted.', 'Signals'],
  ['A steady yellow traffic light means:', 'Speed up before it turns red', 'Prepare to stop — the light is about to turn red', 'Proceed without stopping', 'Yield to pedestrians only', 'B', 'Yellow warns that the signal is changing to red; stop if you can do so safely.', 'Signals'],
  ['A flashing red light at an intersection should be treated as:', 'A yield sign', 'A stop sign — stop completely, then proceed when safe', 'A green light', 'An advisory warning only', 'B', 'A flashing red requires a full stop; then yield before entering the intersection.', 'Signals'],
  ['A flashing yellow light means:', 'Stop and wait', 'Slow down and proceed with caution', 'Road closed ahead', 'Yield to oncoming traffic only', 'B', 'A flashing yellow is a caution signal — reduce speed and watch for hazards.', 'Signals'],
  ['A green arrow pointing left on a traffic signal means:', 'Yield to oncoming traffic before turning', 'You have a protected left turn — oncoming traffic is stopped', 'Proceed only if no pedestrians are present', 'U-turns are permitted', 'B', 'A green arrow provides a protected movement; the intersection is controlled so the indicated path is clear.', 'Signals'],
  ['When a traffic signal is completely dark (not working), you should:', 'Proceed at normal speed — signals are advisory only', 'Treat the intersection as a four-way stop', 'Yield only to traffic on the larger road', 'Stop once, then proceed freely', 'B', 'A non-functioning signal defaults to four-way stop rules — all vehicles stop and take turns.', 'Signals'],

  // ── RIGHT OF WAY ─────────────────────────────────────────────────────────────
  ['At a four-way stop, two cars arrive at the same time. Who goes first?', 'The driver going straight', 'The driver on the right', 'The larger vehicle', 'The driver who got there second', 'B', 'When vehicles arrive simultaneously, yield to the driver on your right.', 'Right-of-way'],
  ['When turning left at a green light, you must:', 'Turn without stopping', 'Yield to oncoming vehicles and pedestrians before turning', 'Honk and proceed', 'Only turn when an arrow appears', 'B', 'A green ball light does not protect left turns — you must yield to anyone crossing your path.', 'Right-of-way'],
  ['A vehicle already in a roundabout (traffic circle) has the right of way over:', 'No one — it must yield to entering traffic', 'Vehicles entering the roundabout', 'Pedestrians only', 'Emergency vehicles', 'B', 'Traffic circulating inside a roundabout has priority; entering vehicles must yield.', 'Right-of-way'],
  ['When merging onto a highway, the responsibility to yield belongs to:', 'Highway traffic', 'The vehicle merging onto the highway', 'Both equally', 'Whichever car is smaller', 'B', 'Merging drivers must find a safe gap; highway traffic is not required to slow down for them.', 'Right-of-way'],
  ['A pedestrian is crossing at a marked crosswalk without a signal. You must:', 'Honk to warn them', 'Stop and yield until they have fully crossed', 'Slow to 15 mph and pass behind them', 'Proceed if they are more than one lane away', 'B', 'Pedestrians in crosswalks always have the right of way; pass only after they have completely cleared your lane.', 'Right-of-way'],

  // ── SPEED & FOLLOWING DISTANCE ───────────────────────────────────────────────
  ['The recommended minimum following distance in normal conditions is:', 'One car length per 10 mph', 'At least two seconds behind the vehicle ahead', 'At least five car lengths at all speeds', 'One second for every 20 mph', 'B', 'The two-second rule ensures a safe stopping gap under normal road conditions.', 'Following distance'],
  ['In poor visibility, rain, or snow, your following distance should be:', 'The same as dry conditions', 'At least doubled — four or more seconds', 'One second', 'Reduced to stay close to the vehicle ahead', 'B', 'Wet or slippery roads increase stopping distance significantly; increase following distance to compensate.', 'Following distance'],
  ['The "basic speed rule" requires that you:', 'Always drive at the posted speed limit', 'Drive at a speed reasonable and safe for current conditions', 'Maintain 55 mph on highways at all times', 'Never exceed 25 mph in cities', 'B', 'Even below the posted limit, you can be cited if your speed is unsafe for weather, traffic, or road conditions.', 'Speed'],
  ['School zone speed limits are typically enforced:', 'All day, every day', 'When signs, signals, or flashing lights indicate children are present', 'Only between 8 am and 3 pm', 'Only when a crossing guard is present', 'B', 'School zone restrictions apply when children may be present — check the sign for the specific enforcement method.', 'Speed'],

  // ── ALCOHOL & IMPAIRMENT ─────────────────────────────────────────────────────
  ['The legal blood alcohol concentration (BAC) limit for drivers 21 and older in all U.S. states is:', '0.05%', '0.08%', '0.10%', '0.15%', 'B', 'All 50 states set 0.08% as the per se DUI/DWI limit for adults — at or above this level, you are legally impaired.', 'Alcohol'],
  ['Most states apply a near-zero BAC tolerance for drivers under 21 because:', 'Young drivers are better drivers when slightly impaired', 'Underage drinking is illegal — any measurable alcohol indicates a law was already broken', 'The regular 0.08% limit is too lenient for adults', 'Insurance rates are lower with a zero-tolerance rule', 'B', 'Zero-tolerance laws reflect that underage drinking itself is illegal, so even trace alcohol is grounds for license suspension.', 'Alcohol'],
  ['Alcohol affects driving ability by:', 'Improving reaction time at low doses', 'Slowing reaction time, impairing judgment, and reducing coordination', 'Only affecting vision', 'Having no effect below 0.05% BAC', 'B', 'Even small amounts of alcohol impair the brain functions needed for safe driving.', 'Alcohol'],
  ['Under implied-consent laws, refusing a chemical test (breath, blood, urine) when lawfully requested by police typically results in:', 'No penalty if you are sober', 'Automatic license suspension regardless of whether you were actually impaired', 'A smaller fine than a DUI conviction', 'Dismissal of any DUI charge', 'B', 'Implied consent means that driving is a privilege conditioned on agreeing to testing; refusal triggers immediate administrative penalties.', 'Alcohol'],

  // ── SCHOOL BUSES ─────────────────────────────────────────────────────────────
  ['On an undivided two-lane road, a school bus stops with flashing red lights. Vehicles in BOTH directions must:', 'Slow to 15 mph and pass carefully', 'Stop at least 10 feet from the bus and wait until the lights stop flashing', 'Stop only if children are visible outside the bus', 'Yield to oncoming traffic before passing', 'B', 'On undivided roads, all traffic in both directions must stop for a school bus loading or unloading passengers.', 'School bus'],
  ['On a divided highway with a raised median, you must stop for a school bus:', 'In both directions', 'Only if you are traveling in the same direction as the bus', 'Only if the median is less than 5 feet wide', 'Never — a median exempts all traffic', 'B', 'A physical median separates opposing traffic; only vehicles traveling the same direction as the bus must stop.', 'School bus'],

  // ── EMERGENCY VEHICLES ───────────────────────────────────────────────────────
  ['When you hear a siren or see flashing lights from an emergency vehicle approaching, you must:', 'Speed up to clear the intersection', 'Pull to the right edge of the road and stop until it passes', 'Slow down and stay in your lane', 'Pull to the left and stop', 'B', 'Yielding to the right and stopping gives emergency vehicles a clear path; always check that stopping is safe first.', 'Emergency vehicles'],
  ['"Move Over" laws require drivers approaching a stopped emergency or highway service vehicle with lights flashing to:', 'Maintain normal speed', 'Move over one lane away from the vehicle, or slow down significantly if a lane change is not possible', 'Stop completely on the highway', 'Activate hazard lights only', 'B', 'Move Over laws protect officers, tow drivers, and first responders stopped on the roadside.', 'Emergency vehicles'],

  // ── LANE MARKINGS & PASSING ──────────────────────────────────────────────────
  ['A solid yellow line on YOUR side of the center line means:', 'Passing is permitted from your side', 'Passing is prohibited from your side', 'Slow down — bumps ahead', 'Yield to oncoming traffic', 'B', 'A solid yellow on your side prohibits you from passing; a dashed yellow allows passing when safe.', 'Lane markings'],
  ['Double solid yellow center lines indicate:', 'Passing allowed in both directions', 'Passing prohibited in both directions', 'A two-way left-turn lane', 'A bike lane boundary', 'B', 'Double solid yellow lines mean neither direction may cross to pass.', 'Lane markings'],
  ['A solid white line between lanes of traffic traveling in the same direction means:', 'Lane changes are freely allowed', 'Lane changes are discouraged — use caution if you must change lanes', 'You must use the left lane', 'The right lane is for passing only', 'B', 'Solid white lines signal that staying in your lane is important (near intersections, exits, or in turn lanes).', 'Lane markings'],

  // ── PARKING ──────────────────────────────────────────────────────────────────
  ['When parking downhill, regardless of whether there is a curb, you should turn your wheels:', 'Away from the curb (or right if no curb)', 'Toward the curb (or right if no curb)', 'Straight ahead', 'Left in both cases', 'B', 'Downhill: turn wheels toward the curb (or toward the shoulder if no curb) so the car rolls into the curb/edge if the brake fails.', 'Parking'],
  ['You must NOT park within how many feet of a fire hydrant in most states?', '5 feet', '10 feet', '15 feet', '20 feet', 'C', 'Most states require at least 15 feet of clearance around fire hydrants to allow fire hose access.', 'Parking'],

  // ── WEATHER & SKIDS ──────────────────────────────────────────────────────────
  ['If your vehicle goes into a skid on a slippery road, you should:', 'Brake hard and steer straight', 'Ease off the gas and steer gently in the direction you want the front to go', 'Turn the wheel sharply in the opposite direction', 'Accelerate to regain traction', 'B', 'Smooth steering toward your intended path and releasing the accelerator helps restore control without worsening the skid.', 'Weather'],
  ['Hydroplaning occurs when:', 'Tires grip wet pavement especially well', 'A layer of water lifts your tires off the road surface, reducing steering control', 'Rain causes the engine to overheat', 'Windshield wipers stop working', 'B', 'At higher speeds on wet roads, tires can ride on a film of water rather than the pavement — reduce speed in heavy rain.', 'Weather'],

  // ── RAILROAD CROSSINGS ───────────────────────────────────────────────────────
  ['At a railroad crossing with flashing lights and a lowering gate, you must:', 'Drive around the gate if no train is visible', 'Stop before the gate and wait until the lights stop and the gate fully rises', 'Proceed slowly if the gate has not fully lowered yet', 'Honk before crossing', 'B', 'Trains cannot stop quickly — never go around lowered gates or cross when signals are active.', 'Railroad'],

  // ── CRASHES & REPORTING ──────────────────────────────────────────────────────
  ['If you are involved in a collision that causes injury, death, or significant property damage, you must:', 'Leave your contact info on a note if no one is around', 'Stop, render reasonable aid, exchange information, and report to authorities as required', 'Move your vehicle immediately and contact your insurance later', 'Only stop if you caused the crash', 'B', 'Hit-and-run is a serious criminal offense; you are legally required to stop, assist, and share information.', 'Crashes'],

  // ── EQUIPMENT ────────────────────────────────────────────────────────────────
  ['You must use your headlights:', 'Only between midnight and 4 am', 'From sunset to sunrise and whenever visibility is too limited to see clearly', 'Only in rain', 'Only on highways', 'B', 'Headlights are required at night and whenever light conditions reduce your ability to see other vehicles and hazards.', 'Equipment'],
  ['High-beam headlights should be switched to low beams when:', 'Entering a highway', 'Within 500 feet of an oncoming vehicle or within 200–300 feet when following another vehicle', 'Only when signaled by oncoming drivers', 'Only in fog', 'B', 'High beams blind oncoming and preceding drivers; dim them early enough to avoid impairing others.', 'Equipment'],
];

module.exports = { UNIVERSAL_QUESTIONS };
