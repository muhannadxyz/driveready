/**
 * Seeds SQLite with DriveReady demo data.
 *
 * WHY wipe-and-replace: keeps `npm run seed` deterministic for development
 * without migration machinery. Production would use migrations instead.
 */

require('dotenv').config();
const { db } = require('./database');
const path = require('path');

// WHY: questions are split across batch files to keep each file manageable.
// Batch 1 = states 1–9, Batch 2 = 10–21 + 25, Batch 3 = 22–24 + 26–27,
// Batch 4 = 28–32, Universal = remaining 17 states that share a common question set.
const { AL_QUESTIONS, AK_QUESTIONS, AZ_QUESTIONS, AR_QUESTIONS, CA_QUESTIONS,
        CO_QUESTIONS, CT_QUESTIONS, DE_QUESTIONS, FL_QUESTIONS } = require('./questions_all_states');
const { GA_QUESTIONS, HI_QUESTIONS, ID_QUESTIONS, IL_QUESTIONS, IN_QUESTIONS,
        IA_QUESTIONS, KS_QUESTIONS, KY_QUESTIONS, LA_QUESTIONS, ME_QUESTIONS,
        MD_QUESTIONS, MA_QUESTIONS, MO_QUESTIONS } = require('./questions_batch2');
const { MI_QUESTIONS, MN_QUESTIONS, MS_QUESTIONS, MT_QUESTIONS,
        NE_QUESTIONS } = require('./questions_batch3');
const { NV_QUESTIONS, NH_QUESTIONS, NJ_QUESTIONS, NM_QUESTIONS,
        NY_QUESTIONS } = require('./questions_batch4');
const { UNIVERSAL_QUESTIONS } = require('./questions_universal');

/** Ohio's fixed state_id when states are inserted alphabetically by code (1..50). */
const OH_ID = 35;

const STATES = [
  // id, code, name, dmv_name, handbook_url (direct PDF/page), test_question_count, passing_score
  [1,  'AL', 'Alabama',        'DMV',     'https://www.alea.gov/sites/default/files/2023-04/Alabama_Driver_Manual.pdf', 30, 80],
  [2,  'AK', 'Alaska',         'DMV',     'https://doa.alaska.gov/dmv/akuse/drivermanual.pdf', 20, 80],
  [3,  'AZ', 'Arizona',        'MVD',     'https://azdot.gov/sites/default/files/media/MVD-Arizona-Driver-License-Manual.pdf', 30, 80],
  [4,  'AR', 'Arkansas',       'OMV',     'https://www.dfa.arkansas.gov/images/uploads/motorVehicleOfficesPage/Drivers_Study_Guide.pdf', 25, 80],
  [5,  'CA', 'California',     'DMV',     'https://www.dmv.ca.gov/web/eng_pdf/dl600.pdf', 46, 83],
  [6,  'CO', 'Colorado',       'DMV',     'https://dmv.colorado.gov/sites/dmv/files/documents/DR_2337_Jan2025.pdf', 25, 80],
  [7,  'CT', 'Connecticut',    'DMV',     'https://portal.ct.gov/-/media/DMV/New-DMV/Publications/drivermanual.pdf', 25, 80],
  [8,  'DE', 'Delaware',       'DMV',     'https://www.dmv.de.gov/pdf/publications/driver_manual.pdf', 30, 80],
  [9,  'FL', 'Florida',        'DHSMV',   'https://www.flhsmv.gov/pdf/handbooks/englishdriverhandbook.pdf', 50, 80],
  [10, 'GA', 'Georgia',        'DDS',     'https://dds.georgia.gov/sites/dds.georgia.gov/files/Driver_s_Manual_English.pdf', 40, 75],
  [11, 'HI', 'Hawaii',         'DMV',     'https://hidot.hawaii.gov/highways/files/2021/06/mvs-driverManual.pdf', 30, 80],
  [12, 'ID', 'Idaho',          'DMV',     'https://itd.idaho.gov/wp-content/uploads/2022/05/DMV_DriversManual.pdf', 40, 85],
  [13, 'IL', 'Illinois',       'SOS',     'https://www.ilsos.gov/publications/pdf_publications/dsd_a112.pdf', 35, 80],
  [14, 'IN', 'Indiana',        'BMV',     'https://www.in.gov/bmv/files/Driver_Manual.pdf', 50, 84],
  [15, 'IA', 'Iowa',           'DOT',     'https://iowadot.gov/mvd/driverslicense/manuals/Iowa_Driver%27s_Manual.pdf', 35, 80],
  [16, 'KS', 'Kansas',         'DMV',     'https://www.ksrevenue.gov/pdf/DE-36.pdf', 25, 80],
  [17, 'KY', 'Kentucky',       'TC',      'https://drive.ky.gov/driver-licensing/Documents/KY%20Driver%20Manual.pdf', 40, 80],
  [18, 'LA', 'Louisiana',      'OMV',     'https://www.expresslane.org/Documents/LA_Driver_Guide.pdf', 40, 80],
  [19, 'ME', 'Maine',          'BMV',     'https://www.maine.gov/sos/bmv/licenses/manualeng.pdf', 30, 80],
  [20, 'MD', 'Maryland',       'MVA',     'https://mva.maryland.gov/drivers/Documents/drivermanual.pdf', 22, 88],
  [21, 'MA', 'Massachusetts',  'RMV',     'https://www.mass.gov/doc/massachusetts-driver-manual/download', 25, 72],
  [22, 'MI', 'Michigan',       'SOS',     'https://www.michigan.gov/sos/-/media/Project/Websites/sos/license_registrations/3_Operator_Study_Guide.pdf', 50, 80],
  [23, 'MN', 'Minnesota',      'DPS',     'https://dps.mn.gov/divisions/dvs/forms-documents/Documents/Minnesota_Drivers_Manual.pdf', 40, 80],
  [24, 'MS', 'Mississippi',    'DPS',     'https://www.dps.ms.gov/app/media/driver-license/Mississippi_Driver_Manual.pdf', 30, 80],
  [25, 'MO', 'Missouri',       'DOR',     'https://dor.mo.gov/pdf/drivers_guide.pdf', 25, 80],
  [26, 'MT', 'Montana',        'MVD',     'https://doj.mt.gov/wp-content/uploads/2022/07/MVD_DriversManual_English_web.pdf', 33, 90],
  [27, 'NE', 'Nebraska',       'DMV',     'https://dmv.nebraska.gov/sites/dmv.nebraska.gov/files/doc/dvr/NEDriversManual.pdf', 25, 80],
  [28, 'NV', 'Nevada',         'DMV',     'https://dmv.nv.gov/forms/dmv_manual_complete.pdf', 25, 80],
  [29, 'NH', 'New Hampshire',  'DMV',     'https://www.dmv.nh.gov/sites/g/files/ehbemt691/files/inline-documents/sonh/drivermanual.pdf', 40, 80],
  [30, 'NJ', 'New Jersey',     'MVC',     'https://www.nj.gov/mvc/pdf/license/NJDriverManual.pdf', 50, 80],
  [31, 'NM', 'New Mexico',     'MVD',     'https://www.mvd.newmexico.gov/files/drivers-guide-eng.pdf', 25, 72],
  [32, 'NY', 'New York',       'DMV',     'https://dmv.ny.gov/sites/default/files/2023-05/driverManual.pdf', 20, 80],
  [33, 'NC', 'North Carolina', 'DMV',     'https://www.ncdot.gov/dmv/license-id/driver-license/Documents/DMV-Handbook.pdf', 25, 80],
  [34, 'ND', 'North Dakota',   'DOT',     'https://www.dot.nd.gov/divisions/driverslicense/docs/northdakotadrivermanual.pdf', 25, 80],
  // Ohio — temps knowledge test: 40 questions, need 75% (30 correct) to pass (BMV-published format)
  [OH_ID, 'OH', 'Ohio',        'BMV',     'https://dam.assets.ohio.gov/image/upload/publicsafety.ohio.gov/hsy7607.pdf', 40, 75],
  [36, 'OK', 'Oklahoma',       'DPS',     'https://oklahoma.gov/content/dam/ok/en/dps/documents/driver-license/DriverManual.pdf', 25, 80],
  [37, 'OR', 'Oregon',         'DMV',     'https://www.oregon.gov/odot/DMV/docs/oregon_driver_manual.pdf', 35, 80],
  [38, 'PA', 'Pennsylvania',   'PennDOT', 'https://www.dmv.pa.gov/Documents/Driver%20Manuals/Pennsylvania%20Driver%27s%20Manual%20(PDF).pdf', 18, 84],
  [39, 'RI', 'Rhode Island',   'DMV',     'https://dmv.ri.gov/documents/forms/driver/RI_Driver_Manual.pdf', 50, 80],
  [40, 'SC', 'South Carolina', 'DMV',     'https://www.scdmvonline.com/DMVNew/forms/Drivers_Manual.pdf', 30, 80],
  [41, 'SD', 'South Dakota',   'DPS',     'https://dps.sd.gov/application/files/9416/5060/7461/SDDriversManual.pdf', 25, 80],
  [42, 'TN', 'Tennessee',      'DMV',     'https://www.tn.gov/content/dam/tn/safety/documents/ManualEnglish.pdf', 30, 80],
  [43, 'TX', 'Texas',          'DPS',     'https://www.dps.texas.gov/sites/default/files/documents/dl/publications/en/driverhandbookeng.pdf', 30, 80],
  [44, 'UT', 'Utah',           'DLD',     'https://dld.utah.gov/wp-content/uploads/sites/17/2021/09/dld_drivershandbook.pdf', 25, 80],
  [45, 'VT', 'Vermont',        'DMV',     'https://dmv.vermont.gov/sites/dmv/files/documents/DMV_Drive_OperatorManual_0.pdf', 20, 80],
  [46, 'VA', 'Virginia',       'DMV',     'https://www.dmv.virginia.gov/webdoc/pdf/dmv39.pdf', 35, 80],
  [47, 'WA', 'Washington',     'DOL',     'https://www.dol.wa.gov/driverslicense/docs/driverguide-en.pdf', 40, 80],
  [48, 'WV', 'West Virginia',  'DMV',     'https://transportation.wv.gov/DMV/DocFiles/WVDriversHandbook.pdf', 25, 80],
  [49, 'WI', 'Wisconsin',      'DMV',     'https://wisconsindmv.gov/documents/WI_BDS126.pdf', 50, 80],
  [50, 'WY', 'Wyoming',        'DOT',     'https://www.dot.state.wy.us/files/live/sites/wydot/files/shared/Driver_Services/Driver%27s%20License/WY%20Driver%27s%20License%20Test%20Manual.pdf', 25, 80],
];

/** Real Ohio BMV driver exam station style sites with approximate coordinates. */
const OH_LOCATIONS = [
  // Major cities
  ['Columbus — Alum Creek', '1575 Alum Creek Dr', 'Columbus', 39.938247, -82.942584, 'Mon–Fri 8–5', '(614) 752-7600'],
  ['Columbus — Morse Road', '1375 Morse Rd', 'Columbus', 40.060753, -82.981892, 'Mon–Fri 8–5', '(614) 436-0450'],
  ['Cleveland — Euclid Avenue', '3000 Euclid Ave', 'Cleveland', 41.502384, -81.667216, 'Mon–Fri 8–5', '(216) 623-3900'],
  ['Cincinnati — Wooster Pike', '6300 Wooster Pike', 'Cincinnati', 39.1578, -84.3956, 'Mon–Fri 8–5', '(513) 771-2250'],
  ['Toledo — Monroe Street', '2201 Monroe St', 'Toledo', 41.655923, -83.553903, 'Mon–Fri 8–5', '(419) 245-3200'],
  ['Akron — South Main', '1610 S Main St', 'Akron', 41.042930, -81.527213, 'Mon–Fri 8–5', '(330) 762-2480'],
  ['Dayton — Dorothy Lane', '2200 E Dorothy Ln', 'Dayton', 39.7582, -84.1386, 'Mon–Fri 8–5', '(937) 224-8862'],
  ['Youngstown — Federal Plaza', '20 W Federal St', 'Youngstown', 41.1012, -80.6495, 'Mon–Fri 8–5', '(330) 740-2175'],
  // Northeast Ohio
  ['Canfield — South Range', '4700 W South Range Rd', 'Canfield', 41.0284, -80.7718, 'Mon–Fri 8–5', '(330) 533-3345'],
  ['Parma — Pearl Road', '5420 Pearl Rd', 'Parma', 41.413605, -81.734110, 'Mon–Fri 8–5', '(440) 887-3838'],
  ['Lakewood — Detroit Ave', '14600 Detroit Ave', 'Lakewood', 41.4851, -81.8002, 'Mon–Fri 8–5', '(216) 529-8800'],
  ['Mentor — Munson Road', '8550 Munson Rd', 'Mentor', 41.7010, -81.3399, 'Mon–Fri 8–5', '(440) 255-5805'],
  ['Elyria — Chestnut Commons', '657 Chestnut Commons Dr', 'Elyria', 41.346707, -82.065733, 'Mon–Fri 8–5', '(440) 323-9466'],
  ['Warren — Elm Road', '3964 Elm Rd NE', 'Warren', 41.249930, -80.799275, 'Mon–Fri 8–5', '(330) 372-2250'],
  ['Ravenna — West Main', '244 W Main St', 'Ravenna', 41.1564, -81.2420, 'Mon–Fri 8–5', '(330) 297-3820'],
  ['Medina — Westfield Rd', '921 Westfield Rd', 'Medina', 41.011039, -81.940983, 'Mon–Fri 8–5', '(330) 764-8144'],
  ['Canton — Tuscarawas St', '4800 Tuscarawas St W', 'Canton', 40.799878, -81.396819, 'Mon–Fri 8–5', '(330) 438-0370'],
  // Northwest Ohio
  ['Mansfield — Lexington Ave', '955 Lexington Ave', 'Mansfield', 40.732291, -82.534972, 'Mon–Fri 8–5', '(419) 774-5514'],
  ['Findlay — Bright Road', '318 Bright Rd', 'Findlay', 41.041238, -83.610282, 'Mon–Fri 8–5', '(419) 424-4860'],
  ['Lima — Spencerville Rd', '2435 Spencerville Rd', 'Lima', 40.730422, -84.138100, 'Mon–Fri 8–5', '(419) 227-4535'],
  ['Bowling Green — Sand Ridge Rd', '350 Sand Ridge Rd', 'Bowling Green', 41.366966, -83.653946, 'Mon–Fri 8–5', '(419) 353-9465'],
  ['Sandusky — Hayes Ave', '2310 Hayes Ave', 'Sandusky', 41.4551, -82.6980, 'Mon–Fri 8–5', '(419) 625-7818'],
  // Southwest Ohio
  ['Springfield — Gateway', '108 N Limestone St', 'Springfield', 39.9242, -83.8088, 'Mon–Fri 8–5', '(937) 325-3900'],
  ['Hamilton — Hamilton-Cleves Rd', '1690 Hamilton-Cleves Rd', 'Hamilton', 39.4021, -84.5743, 'Mon–Fri 8–5', '(513) 863-7200'],
  ['Middletown — Tytus Ave', '3907 Tytus Ave', 'Middletown', 39.5389, -84.3616, 'Mon–Fri 8–5', '(513) 422-9230'],
  ['Xenia — Detroit St', '51 N Detroit St', 'Xenia', 39.6837, -83.9258, 'Mon–Fri 8–5', '(937) 372-4481'],
  // Central Ohio
  ['Newark — Mt Vernon Rd', '750 Mt Vernon Rd', 'Newark', 40.0773, -82.4152, 'Mon–Fri 8–5', '(740) 349-6591'],
  ['Lancaster — Hospital Dr', '101 Hospital Dr', 'Lancaster', 39.7211, -82.5894, 'Mon–Fri 8–5', '(740) 687-6680'],
  ['Chillicothe — Crouse Chapel Rd', '257 Crouse Chapel Rd', 'Chillicothe', 39.3395, -82.9824, 'Mon–Fri 8–5', '(740) 773-2607'],
  ['Zanesville — Maysville Pike', '2450 Maysville Pike', 'Zanesville', 39.8987, -82.0272, 'Mon–Fri 8–5', '(740) 453-0189'],
  ['Wooster — Vanover St', '220 Vanover St', 'Wooster', 40.7963, -81.9482, 'Mon–Fri 8–5', '(330) 264-7985'],
  // Southeast / Appalachian Ohio
  ['Portsmouth — Gallia St', '1831 Gallia St', 'Portsmouth', 38.7374, -82.9788, 'Mon–Fri 8–5', '(740) 354-3167'],
  ['Athens — Richland Ave', '500 Richland Ave', 'Athens', 39.3074, -82.1040, 'Mon–Fri 8–5', '(740) 593-6530'],
  ['Steubenville — 4th Street', '110 N 4th St', 'Steubenville', 40.3607, -80.6147, 'Mon–Fri 8–5', '(740) 283-8916'],
];

/**
 * Ohio practice questions — educational summaries aligned with common BMV topics.
 * correct_answer is 'A' | 'B' | 'C' | 'D'
 */
const OH_QUESTIONS = [
  ['When approaching a steady red traffic light, you must:', 'Stop before the crosswalk or stop line', 'Slow down and proceed if clear', 'Honk and continue', null, 'A', 'A red light means full stop before entering the intersection unless turning where permitted by a sign.', 'Signals'],
  ['Ohio\'s default speed limit in urban districts, unless posted otherwise, is often:', '25 mph', '35 mph', '45 mph', '55 mph', 'B', 'Residential and urban areas commonly use 25–35 mph; always obey posted limits.', 'Speed'],
  ['The legal blood alcohol concentration (BAC) limit for drivers under 21 in Ohio is:', '0.08%', '0.02%', '0.05%', '0.10%', 'B', 'Ohio has a zero-tolerance style limit for under 21 — any measurable alcohol can lead to penalties.', 'Alcohol'],
  ['When a school bus stops on a two-lane road with red lights flashing, you must:', 'Pass slowly', 'Stop at least 10 feet from the front or rear', 'Stop only if children are visible', 'Use your horn to alert the driver', 'B', 'Both directions must stop on undivided roads until the bus moves or signals stop.', 'School bus'],
  ['Use of a handheld electronic device while driving for texting is:', 'Allowed at red lights', 'Prohibited for drivers under 18', 'Recommended for navigation', 'Optional', 'B', 'Ohio restricts electronic device use for young drivers; distraction laws aim to reduce crashes.', 'Distracted driving'],
  ['A yellow traffic signal means:', 'Accelerate to beat the light', 'Stop if you can do so safely', 'Ignore if turning right', 'Flash headlights', 'B', 'Yellow warns the light will turn red; stop unless stopping would be unsafe.', 'Signals'],
  ['At a four-way stop, who goes first?', 'The largest vehicle', 'The driver who arrived first', 'The driver on the right always', 'Whoever honks', 'B', 'First-come, first-served; ties yield to the driver on the right.', 'Right-of-way'],
  ['When merging onto a highway, you should:', 'Stop at the end of the ramp', 'Match the speed of traffic in the gap', 'Drive on the shoulder', 'Use hazard lights only', 'B', 'Acceleration lanes exist so you can blend at highway speed.', 'Highway'],
  ['Headlights must be on from sunset to sunrise and when:', 'Visibility is less than 1000 feet', 'It is cloudy', 'Driving in parking lots only', 'Never in rain', 'A', 'Ohio requires headlights in darkness and when visibility is seriously reduced.', 'Equipment'],
  ['If you skid on a slippery road, you should:', 'Brake hard and lock wheels', 'Steer gently in the direction you want the front of the car to go', 'Turn off the engine', 'Shift to park', 'B', 'Look where you want to go and steer smoothly; avoid panic braking.', 'Emergencies'],
  ['A solid white line at the edge of the roadway generally means:', 'Passing is encouraged', 'Lane changes are prohibited next to the line', 'You may park on either side', 'Construction ahead only', 'B', 'Edge lines mark travel lanes; crossing solid lines is often restricted.', 'Lane markings'],
  ['Before changing lanes, you should:', 'Signal, check mirrors, and blind spot', 'Signal only', 'Change quickly without signaling', 'Honk twice', 'A', 'A systematic check prevents sideswipe crashes.', 'Lane change'],
  ['If you are involved in a crash with injury or death, you must:', 'Leave immediately', 'Stop, render aid, and exchange information', 'Move vehicles before police arrive always', 'Post on social media first', 'B', 'Ohio law requires stopping, assisting when safe, and reporting serious crashes.', 'Crashes'],
  ['Open container of alcohol in the passenger area is:', 'Allowed for passengers', 'Generally prohibited in motor vehicles on highways', 'Allowed in cup holders', 'Only illegal at night', 'B', 'Open container rules reduce drinking while driving.', 'Alcohol'],
  ['When approaching a railroad crossing with lowering gates, you must:', 'Drive around the gates if no train', 'Stop behind the stop line or gate', 'Speed up to cross', 'Ignore if lights are flashing slowly', 'B', 'Never go around gates; trains cannot stop quickly.', 'Railroad'],
  ['A triangular orange sign on the rear of a vehicle usually indicates:', 'Emergency vehicle', 'Slow-moving vehicle', 'School bus', 'Mail truck', 'B', 'Reflective triangle marks vehicles that travel well below normal speed.', 'Signs'],
  ['Using the shoulder to pass traffic on the right is:', 'Legal anytime', 'Generally illegal except where permitted for slow traffic', 'Encouraged in traffic jams', 'Required for trucks', 'B', 'Shoulder driving is restricted; passing on the right has narrow exceptions.', 'Passing'],
  ['When parking uphill with a curb, turn wheels:', 'Toward the curb', 'Away from the curb', 'Straight only', 'Toward traffic', 'B', 'Away from the curb so the curb can stop a roll backward into traffic.', 'Parking'],
  ['A flashing red signal at an intersection behaves like:', 'A yield sign', 'A stop sign', 'A green light', 'A speed advisory', 'B', 'Flashing red means stop completely before proceeding when safe.', 'Signals'],
  ['If another driver is tailgating you, you should:', 'Brake-check them', 'Increase following distance and change lanes when safe', 'Speed up dangerously', 'Wave them past on the shoulder', 'B', 'Creating space reduces rear-end risk; avoid aggressive responses.', 'Defensive driving'],
  ['Work zone fines are often higher because:', 'Workers may be present near traffic', 'Paint is expensive', 'Cameras are decorative', 'Lanes are wider', 'A', 'Reduced speeds and penalties protect road workers.', 'Work zones'],
  ['A green arrow left turn signal means:', 'Yield to oncoming then turn', 'Protected turn in the direction of the arrow if clear of pedestrians', 'Stop always', 'Merge right', 'B', 'A green arrow gives a protected movement when the way is clear of people in the crosswalk.', 'Signals'],
  ['Hydroplaning is most likely when:', 'Road is dry', 'Tires have deep tread and speed is low', 'Water builds under tires and speed is high', 'Using winter tires only', 'C', 'Thin water film lifts tires; slow down in heavy rain.', 'Weather'],
  ['Before driving in winter conditions, you should:', 'Remove snow/ice from windows and lights', 'Warm the car only inside the garage with door closed', 'Use only parking brake', 'Disable ABS', 'A', 'Full visibility and cleared sensors/lights are required for safe driving.', 'Weather'],
  ['If your vehicle begins to drift off the pavement, you should:', 'Jerk the wheel sharply back', 'Ease off gas, grip firmly, and re-enter gradually', 'Close your eyes', 'Brake hard immediately', 'B', 'Gradual steering avoids loss of control on the edge.', 'Emergencies'],
  ['Ohio\'s "Move Over" law requires drivers approaching a stopped emergency vehicle on a multi-lane road to:', 'Speed up to pass quickly', 'Move one lane away from the stopped vehicle if safe', 'Turn on hazard lights only', 'Stop behind the vehicle', 'B', 'Moving over protects first responders and tow operators on the roadside.', 'Laws'],
  ['When parallel parking, your wheels should be no more than how far from the curb?', '6 inches', '12 inches', '18 inches', '24 inches', 'B', 'Ohio requires wheels within 12 inches of the curb to keep the vehicle out of the travel lane.', 'Parking'],
  ['A solid yellow center line on your side of the road means:', 'Passing is permitted', 'Passing is prohibited from your side', 'The road is one-way', 'Passing is only allowed at night', 'B', 'A solid yellow on your side means you must not cross it to pass.', 'Lane markings'],
  ['When turning left at a green light, you must yield to:', 'No one — green means go', 'Oncoming traffic and pedestrians in the crosswalk', 'Vehicles behind you only', 'Cyclists only', 'B', 'A permissive green left turn is unprotected; oncoming vehicles and crosswalk users have priority.', 'Right-of-way'],
  ['Ohio\'s implied consent law means that by driving you have agreed to:', 'Pay all traffic fines immediately', 'Submit to chemical testing if lawfully arrested for OVI', 'Allow search of your vehicle at any time', 'Waive your right to an attorney', 'B', 'Refusing a chemical test after a lawful OVI arrest triggers automatic license suspension.', 'Alcohol'],
  ['At night you should use low-beam headlights when within how many feet of an oncoming vehicle?', '100 feet', '200 feet', '500 feet', '1000 feet', 'C', 'Switching to low beams at 500 feet prevents blinding oncoming drivers.', 'Equipment'],
  ['You should signal a turn or lane change at least how far in advance in a city?', '50 feet', '100 feet', '200 feet', '300 feet', 'B', 'Ohio requires signaling at least 100 feet before a turn in urban areas.', 'Laws'],
  ['When a pedestrian is in a marked crosswalk, you must:', 'Honk to let them know you are there', 'Yield until they have completely crossed', 'Proceed if they are still on the curb', 'Yield only if the light is red', 'B', 'Pedestrians in crosswalks always have the right-of-way; wait until they clear.', 'Right-of-way'],
  ['A broken white line between lanes means:', 'Lane changes are prohibited', 'You may change lanes when safe', 'It is a bike lane boundary', 'Passing on the right is always prohibited', 'B', 'Broken white lines separate same-direction lanes and permit lane changes.', 'Lane markings'],
  ['If your brakes fail while driving, you should first:', 'Turn off the ignition immediately', 'Pump the brakes rapidly and downshift', 'Open the door and jump out', 'Swerve into oncoming traffic', 'B', 'Pumping can restore hydraulic pressure; downshifting also slows the vehicle.', 'Emergencies'],
  ['Driving with only one working headlight is:', 'Acceptable in rural areas', 'Illegal; both headlights must work', 'Allowed if you use high beams', 'Only a daytime issue', 'B', 'Both headlights are required equipment under Ohio law at night.', 'Equipment'],
  ['Which sign is always eight-sided (octagonal)?', 'Yield', 'Stop', 'Wrong Way', 'Do Not Enter', 'B', 'The octagonal shape uniquely identifies stop signs even when visibility is poor.', 'Signs'],
  ['When sharing the road with a large truck, you should avoid:', 'Following at a normal distance', 'Cutting in front of a truck and braking suddenly', 'Passing on the left', 'Dimming your headlights', 'B', 'Trucks need far more stopping distance — cutting in front is extremely dangerous.', 'Sharing road'],
  ['What should you do if you miss your highway exit?', 'Reverse on the shoulder', 'Continue to the next exit', 'Cross the median', 'Stop in the travel lane', 'B', 'Never reverse or cross medians on a highway; take the next exit safely.', 'Highway'],
  ['Ohio requires child passengers under what age to use a booster or child safety seat?', '4 years', '6 years', '8 years', '10 years', 'C', 'Ohio law requires appropriate child restraints for children under 8 years old.', 'Laws'],
];

const OH_CHAPTERS = [
  [1, 'Introduction & Testing', 'Overview of Ohio licensing stages, identification requirements, and how the knowledge and road tests fit into earning a full license.', 'https://www.bmv.ohio.gov/dl-handbook.aspx'],
  [2, 'Traffic Signs & Signals', 'Recognizing regulatory, warning, and guide signs; understanding traffic lights and pavement markings that control movement.', 'https://www.bmv.ohio.gov/dl-handbook.aspx'],
  [3, 'Safe Vehicle Operation', 'Speed management, following distance, lane use, passing, and sharing the road with large vehicles and motorcycles.', 'https://www.bmv.ohio.gov/dl-handbook.aspx'],
  [4, 'Alcohol, Drugs, & Distraction', 'Ohio implied consent, legal limits, effects of impairment, and laws aimed at reducing distracted driving.', 'https://www.bmv.ohio.gov/dl-handbook.aspx'],
  [5, 'Emergencies & Crashes', 'What to do after a collision, reporting requirements, basic first-aid mindset, and avoiding secondary crashes.', 'https://www.bmv.ohio.gov/dl-handbook.aspx'],
  [6, 'Special Conditions', 'Night driving, weather, work zones, school buses, and railroad crossings — higher-risk situations that need extra care.', 'https://www.bmv.ohio.gov/dl-handbook.aspx'],
];

function wipe() {
  // WHY: route_votes has a FK to routes, so it must be deleted first or the
  // DELETE FROM routes will fail with SQLITE_CONSTRAINT_FOREIGNKEY.
  db.exec(`
    DELETE FROM route_votes;
    DELETE FROM routes;
    DELETE FROM questions;
    DELETE FROM handbook_chapters;
    DELETE FROM locations;
    DELETE FROM states;
  `);
}

function seedStates() {
  const ins = db.prepare(`
    INSERT INTO states (id, code, name, dmv_name, handbook_url, test_question_count, passing_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of STATES) {
    ins.run(...row);
  }
}

function seedOhioLocations() {
  const ins = db.prepare(`
    INSERT INTO locations (state_id, name, address, city, lat, lng, hours, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const loc of OH_LOCATIONS) {
    ins.run(OH_ID, ...loc);
  }
}

function seedQuestions() {
  const ins = db.prepare(`
    INSERT INTO questions (state_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // WHY: each entry maps a state_id to its question array. States 33–50
  // (minus OH=35 which has its own curated set above) share UNIVERSAL_QUESTIONS.
  const stateQuestions = [
    [1,  AL_QUESTIONS],
    [2,  AK_QUESTIONS],
    [3,  AZ_QUESTIONS],
    [4,  AR_QUESTIONS],
    [5,  CA_QUESTIONS],
    [6,  CO_QUESTIONS],
    [7,  CT_QUESTIONS],
    [8,  DE_QUESTIONS],
    [9,  FL_QUESTIONS],
    [10, GA_QUESTIONS],
    [11, HI_QUESTIONS],
    [12, ID_QUESTIONS],
    [13, IL_QUESTIONS],
    [14, IN_QUESTIONS],
    [15, IA_QUESTIONS],
    [16, KS_QUESTIONS],
    [17, KY_QUESTIONS],
    [18, LA_QUESTIONS],
    [19, ME_QUESTIONS],
    [20, MD_QUESTIONS],
    [21, MA_QUESTIONS],
    [22, MI_QUESTIONS],
    [23, MN_QUESTIONS],
    [24, MS_QUESTIONS],
    [25, MO_QUESTIONS],
    [26, MT_QUESTIONS],
    [27, NE_QUESTIONS],
    [28, NV_QUESTIONS],
    [29, NH_QUESTIONS],
    [30, NJ_QUESTIONS],
    [31, NM_QUESTIONS],
    [32, NY_QUESTIONS],
    // NC, ND, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY
    // share a universal question set covering rules consistent across all states
    [33, UNIVERSAL_QUESTIONS],
    [34, UNIVERSAL_QUESTIONS],
    [36, UNIVERSAL_QUESTIONS],
    [37, UNIVERSAL_QUESTIONS],
    [38, UNIVERSAL_QUESTIONS],
    [39, UNIVERSAL_QUESTIONS],
    [40, UNIVERSAL_QUESTIONS],
    [41, UNIVERSAL_QUESTIONS],
    [42, UNIVERSAL_QUESTIONS],
    [43, UNIVERSAL_QUESTIONS],
    [44, UNIVERSAL_QUESTIONS],
    [45, UNIVERSAL_QUESTIONS],
    [46, UNIVERSAL_QUESTIONS],
    [47, UNIVERSAL_QUESTIONS],
    [48, UNIVERSAL_QUESTIONS],
    [49, UNIVERSAL_QUESTIONS],
    [50, UNIVERSAL_QUESTIONS],
  ];

  // Ohio's curated questions
  for (const q of OH_QUESTIONS) {
    ins.run(OH_ID, ...q);
  }

  // All other states
  for (const [stateId, questions] of stateQuestions) {
    for (const q of questions) {
      ins.run(stateId, ...q);
    }
  }
}

function seedHandbook() {
  const ins = db.prepare(`
    INSERT INTO handbook_chapters (state_id, chapter_number, title, summary, official_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const ch of OH_CHAPTERS) {
    ins.run(OH_ID, ...ch);
  }
}

/**
 * Sample routes near Columbus — Alum Creek (first inserted OH location).
 * GeoJSON LineStrings in WGS84 near 39.95, -82.94
 */
function seedSampleRoutes() {
  const loc = db.prepare(`SELECT id FROM locations WHERE state_id = ? ORDER BY id LIMIT 1`).get(OH_ID);
  if (!loc) return;

  const samples = [
    [
      'pass',
      JSON.stringify({
        type: 'LineString',
        coordinates: [
          [-82.9402, 39.9501],
          [-82.9385, 39.9510],
          [-82.9368, 39.9522],
          [-82.9355, 39.9530],
        ],
      }),
      'Neighborhood loop with two right turns and a stop sign at a four-way stop.',
      'Signal early; examiner watched mirror checks before the lane change after the second turn.',
      '2025-11-12',
      4,
    ],
    [
      'fail',
      JSON.stringify({
        type: 'LineString',
        coordinates: [
          [-82.9410, 39.9495],
          [-82.9398, 39.9504],
          [-82.9380, 39.9515],
        ],
      }),
      'Shorter industrial-road segment with a lane merge.',
      'Rolling stop at a sign — examiner noted incomplete stop.',
      '2025-10-03',
      1,
    ],
    [
      'pass',
      JSON.stringify({
        type: 'LineString',
        coordinates: [
          [-82.9375, 39.9498],
          [-82.9362, 39.9506],
          [-82.9348, 39.9518],
          [-82.9335, 39.9525],
        ],
      }),
      'Residential grid with parallel parking demonstration near the end.',
      'Use your reference points for parking; depth perception matters on this street.',
      '2026-01-20',
      7,
    ],
  ];

  const ins = db.prepare(`
    INSERT INTO routes (location_id, result, route_geojson, description, tips, date_taken, upvotes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of samples) {
    ins.run(loc.id, ...s);
  }
}

function run() {
  const tx = db.transaction(() => {
    wipe();
    seedStates();
    seedOhioLocations();
    seedQuestions();
    seedHandbook();
    seedSampleRoutes();
  });
  tx();
  console.log('Seed complete: 50 states with questions, Ohio locations/chapters, sample routes.');
}

run();
