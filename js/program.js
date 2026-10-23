/* Training program (Gym 2.0): 6 days a week, Sunday rest, no deadlifts.
   Mon/Thu Shoulders + Legs, Tue/Fri Chest + Triceps, Wed/Sat Back + Biceps.
   Exercise IDs refer to github.com/hasaneyldrm/exercises-dataset. */
(() => {
  const SHOULDERS = [
    { id: '0310', sets: 3, reps: [10, 12], rest: 75, inc: 'dumbbell', swap: ['0162', '0041'] },
    { id: '0334', sets: 3, reps: [12, 15], rest: 75, inc: 'reps20', swap: ['0178', '0584'] },
    { id: '0203', sets: 3, reps: [12, 15], rest: 75, inc: 'machine', swap: ['0602', '0380'] }
  ];
  const LEGS = [
    { id: '1463', sets: 3, reps: [10, 12], rest: 120, inc: 'legpress', swap: ['0743', '3281'], main: true },
    { id: '0585', sets: 3, reps: [12, 15], rest: 75, inc: 'machine', swap: ['1760'] },
    { id: '0586', sets: 3, reps: [10, 12], rest: 75, inc: 'machine', swap: ['0599'] },
    { id: '0605', sets: 4, reps: [12, 15], rest: 60, inc: 'machine', swap: ['1391', '0594'] }
  ];
  const CHEST = [
    { id: '0314', sets: 3, reps: [8, 10], rest: 150, inc: 'dumbbell', swap: ['0757', '1299'] },
    { id: '0025', sets: 3, reps: [8, 10], rest: 150, inc: 'barbell', swap: ['0289', '0577'], main: true },
    { id: '1269', sets: 3, reps: [12, 15], rest: 75, inc: 'machine', swap: ['0155', '0596'], label: 'Cable Fly (high-to-low)', note: 'Pulleys set high; sweep down and together to target the lower chest.' }
  ];
  const TRICEPS = [
    { id: '0194', sets: 3, reps: [10, 12], rest: 75, inc: 'machine', swap: ['1722', '0060'] },
    { id: '0200', sets: 3, reps: [10, 12], rest: 75, inc: 'machine', swap: ['0241'] },
    { id: '0201', sets: 3, reps: [10, 12], rest: 75, inc: 'machine', swap: ['0207', '0241'] }
  ];
  const BACK = [
    { id: '0150', sets: 4, setsText: '2 + 2', reps: [8, 12], rest: 90, inc: 'machine', swap: ['0818', '0197'], main: true,
      label: 'Lat Pulldown (2 bars)', setLabels: ['Bar 1', 'Bar 1', 'Bar 2', 'Bar 2'],
      note: '2 sets with the wide straight bar, then 2 sets with a second bar (e.g. wide neutral-grip or pro lat bar).' },
    { id: '2616', sets: 3, reps: [8, 12], rest: 90, inc: 'machine', swap: ['0245', '0818'] },
    { id: '0861', sets: 3, reps: [8, 12], rest: 90, inc: 'machine', swap: ['1350', '0292'], label: 'Seated Cable Row (V-bar)' }
  ];
  const BICEPS = [
    { id: '0031', sets: 3, reps: [8, 12], rest: 75, inc: 'barbell', swap: ['0447', '0868'] },
    { id: '0070', sets: 3, reps: [10, 12], rest: 75, inc: 'barbell', swap: ['0592', '0372'] },
    { id: '0318', sets: 3, reps: [10, 12], rest: 75, inc: 'dumbbell', swap: ['0313', '0294'] }
  ];

  const SHORT = { Shoulders: 'Delts', Legs: 'Legs', Chest: 'Chest', Triceps: 'Tris', Back: 'Back', Biceps: 'Bis' };

  // Number items 1..n and tag them with their muscle group
  const day = (key, name, title, warm, groups) => {
    let n = 0;
    const items = groups.flatMap(([group, list]) => list.map((x) => ({ ...x, group, n: String(++n) })));
    const tag = groups.map(([g]) => SHORT[g]).join(' · ');
    return { key, name, short: name.slice(0, 3), title, tag, warm, items };
  };

  window.PROGRAM = {
    // weekday index (0 = Sunday) -> day key; Sunday is rest
    week: [null, 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    order: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],

    days: {
      mon: day('mon', 'Monday', 'Shoulders + Legs', 'legs', [['Shoulders', SHOULDERS], ['Legs', LEGS]]),
      tue: day('tue', 'Tuesday', 'Chest + Triceps', 'push', [['Chest', CHEST], ['Triceps', TRICEPS]]),
      wed: day('wed', 'Wednesday', 'Back + Biceps', 'pull', [['Back', BACK], ['Biceps', BICEPS]]),
      thu: day('thu', 'Thursday', 'Legs + Shoulders', 'legs', [['Legs', LEGS], ['Shoulders', SHOULDERS]]),
      fri: day('fri', 'Friday', 'Chest + Triceps', 'push', [['Chest', CHEST], ['Triceps', TRICEPS]]),
      sat: day('sat', 'Saturday', 'Back + Biceps', 'pull', [['Back', BACK], ['Biceps', BICEPS]])
    },

    warmups: {
      legs: '3 min easy cycling · 10 leg swings each way per leg · 10 bodyweight squats · 10 light lateral raises',
      push: '3 min easy cardio · 10 arm circles each way · 10 push-ups · 15 light band pull-aparts or face pulls',
      pull: '3 min easy rowing · 10 arm circles each way · 10 scapular pulls on the bar · 12 light pulldowns'
    },

    // How much to add once every set reaches the top of the rep range
    increments: {
      barbell: { step: 2.5, text: '+2.5 kg' },
      legpress: { step: 10, text: '+10 kg' },
      dumbbell: { step: 2.5, text: 'next dumbbell (+1–2.5 kg per hand)' },
      machine: { step: 5, text: 'next pin (+2.5–5 kg)' },
      reps20: { step: 2.5, text: 'reach 20 reps first, then the next weight' },
      bodyweight: { step: 2.5, text: 'add reps; at the top add 2.5 kg' }
    },

    // Display names (the dataset names are lowercase and sometimes odd)
    names: {
      '0310': 'Dumbbell Front Raise', '0162': 'Cable Front Raise', '0041': 'Barbell Front Raise',
      '0334': 'Dumbbell Lateral Raise', '0178': 'Cable Lateral Raise', '0584': 'Machine Lateral Raise',
      '0203': 'Rope Face Pull', '0602': 'Reverse-fly Machine', '0380': 'Bent-over Rear Delt Raise',
      '1463': '45° Leg Press', '0743': 'Hack Squat', '3281': 'Smith Machine Squat',
      '0585': 'Leg Extension', '1760': 'Goblet Squat',
      '0586': 'Lying Leg Curl', '0599': 'Seated Leg Curl',
      '0605': 'Standing Calf Raise', '1391': 'Calf Press on Leg Press', '0594': 'Seated Calf Raise',
      '0314': 'Incline Dumbbell Press', '0757': 'Smith Incline Press', '1299': 'Incline Machine Press',
      '0025': 'Flat Barbell Bench Press', '0289': 'Flat Dumbbell Press', '0577': 'Machine Chest Press',
      '1269': 'High-to-low Cable Fly', '0155': 'Cable Crossover', '0596': 'Pec Deck',
      '0194': 'Overhead Rope Triceps Extension', '1722': 'High-pulley Overhead Extension', '0060': 'Skull Crusher',
      '0200': 'Rope Triceps Pushdown', '0241': 'V-bar Pushdown',
      '0201': 'Straight Bar Pushdown', '0207': 'Reverse-grip Pushdown',
      '0150': 'Lat Pulldown', '0818': 'Parallel-grip Lat Pulldown', '0197': 'Pro Lat Bar Pulldown',
      '2616': 'Close-grip Pulldown (V-bar)', '0245': 'Underhand Pulldown',
      '0861': 'Seated Cable Row', '1350': 'Machine Seated Row', '0292': 'One-arm Dumbbell Row',
      '0031': 'Barbell Curl', '0447': 'EZ-bar Curl', '0868': 'Cable Curl',
      '0070': 'Preacher Curl', '0592': 'Machine Preacher Curl', '0372': 'Dumbbell Preacher Curl',
      '0318': 'Incline Dumbbell Curl', '0313': 'Dumbbell Hammer Curl', '0294': 'Dumbbell Curl'
    },

    // Coach notes: key cues + common mistakes (the dataset has instructions only)
    notes: {
      '0310': { cues: ['Slight bend in the elbows, palms facing down', 'Raise to eye level, no higher', 'Take 2–3 s on the way down'],
        mistakes: ['Swinging the hips to throw the weight up', 'Leaning back', 'Going above the head (traps take over)'] },
      '0162': { cues: ['Stand facing away from a low pulley', 'Raise to eye level with straight-ish arms', 'Control the way down'],
        mistakes: ['Leaning forward into the cable', 'Using momentum', 'Shrugging'] },
      '0041': { cues: ['Shoulder-width grip, arms almost straight', 'Raise to eye level', 'Squeeze glutes so the back stays still'],
        mistakes: ['Rocking the torso', 'Too heavy', 'Bending the elbows a lot'] },
      '0334': { cues: ['Lean forward slightly and lead with the elbows', 'Stop at shoulder height', 'Take 2–3 s on the way down'],
        mistakes: ['Swinging the body to lift the weight', 'Shrugging the traps up', 'Going too heavy and cutting the range'] },
      '0178': { cues: ['Cable starts behind the body', 'Lead with the elbow up to shoulder height', 'Slow on the way down'],
        mistakes: ['Bending the elbow a lot', 'Swinging', 'Shrugging above shoulder height'] },
      '0203': { cues: ['Cable at face height', 'Pull the rope to your face, elbows high and wide', 'Squeeze rear shoulders for 1 s'],
        mistakes: ['Too heavy, so it becomes a row', 'Elbows dropping low', 'Leaning back to move the weight'] },
      '0602': { cues: ['Chest on the pad, arms at shoulder height', 'Slight elbow bend', 'Sweep the arms back wide'],
        mistakes: ['Shrugging', 'Too heavy', 'Only squeezing the shoulder blades without moving the arms'] },
      '0380': { cues: ['Hinge forward with a flat back', 'Lead with the elbows out to the sides', 'Pause at the top'],
        mistakes: ['Standing up as you lift', 'Swinging', 'Pulling the shoulder blades only'] },
      '1463': { cues: ['Feet shoulder-width in the middle of the platform', 'Go deep but stop before the lower back lifts', 'Don\'t slam the knees into lockout'],
        mistakes: ['Lower back rolling off the pad', 'Locking the knees hard', 'Tiny range with a heavy weight'] },
      '0743': { cues: ['Back flat on the pad', 'Feet shoulder-width', 'Go deep under control'],
        mistakes: ['Heels lifting', 'Knees caving', 'Locking the knees hard'] },
      '3281': { cues: ['Feet slightly in front of the bar', 'Brace before every rep', 'Control the depth'],
        mistakes: ['Feet directly under the bar (knee stress)', 'Half reps', 'Hips shooting up first'] },
      '0585': { cues: ['Knee lined up with the machine pivot', 'Squeeze for 1 s at the top', 'Lower slowly'],
        mistakes: ['Swinging the weight up', 'Hips lifting off the seat', 'Dropping the weight'] },
      '1760': { cues: ['Hold the dumbbell at your chest', 'Elbows inside the knees at the bottom', 'Sit down between the hips'],
        mistakes: ['Heels lifting', 'Rounding the upper back', 'Shallow depth'] },
      '0586': { cues: ['Hips pressed into the pad', 'Curl all the way', 'Take 2–3 s on the way down'],
        mistakes: ['Hips lifting off the pad', 'Slamming the stack', 'Partial reps'] },
      '0599': { cues: ['Thigh pad locked tight', 'Lean the torso slightly forward', 'Slow return'],
        mistakes: ['Loose thigh pad, so the thighs lift', 'Jerking the weight', 'Short range'] },
      '0605': { cues: ['Pause 2 s at the bottom stretch', 'Rise high onto the big toe', 'Knees straight but not locked'],
        mistakes: ['Bouncing at the bottom', 'Bending the knees to cheat', 'Half range'] },
      '1391': { cues: ['Balls of the feet on the platform edge', 'Full stretch at the bottom', 'Press as high as possible'],
        mistakes: ['Bouncing', 'Bending the knees', 'Feet slipping off the edge'] },
      '0594': { cues: ['Knee pad snug on the thighs', 'Full stretch at the bottom', 'Squeeze 1 s at the top'],
        mistakes: ['Bouncing', 'Half reps', 'Rushing'] },
      '0314': { cues: ['Bench at 30–45°', 'Lower the dumbbells to your upper chest for a deep stretch', 'Keep forearms vertical'],
        mistakes: ['Bench too steep, so it turns into a shoulder press', 'Dumbbells drifting wide and low', 'Cutting the bottom of the rep short'] },
      '0757': { cues: ['Set the bench so the bar lands on the upper chest', 'Unrack with a twist of the wrists', 'Control the way down'],
        mistakes: ['Bench in the wrong spot (bar hits neck or belly)', 'Bouncing', 'Elbows flared'] },
      '0025': { cues: ['Pinch shoulder blades together and down, feet flat', 'Lower the bar to the nipple line, elbows 45–70°', 'Touch lightly, then press up and slightly back'],
        mistakes: ['Elbows flared to 90° (hurts the shoulders)', 'Bouncing the bar off the chest', 'Hips lifting off the bench', 'Going heavy without safety pins or a spotter'] },
      '0289': { cues: ['Shoulder blades back', 'Lower to the sides of the chest for a deep stretch', 'Press up and slightly in'],
        mistakes: ['Elbows flared to 90°', 'Bouncing at the bottom', 'Shoulders rolling forward'] },
      '0577': { cues: ['Seat height puts the handles at mid-chest', 'Shoulder blades back', 'Control both directions'],
        mistakes: ['Shoulders rolling forward', 'Slamming into lockout', 'Seat set too high'] },
      '1269': { cues: ['Pulleys high, one step forward, slight lean', 'Sweep the hands down and together to belly-button height', 'Squeeze the lower chest for 1 s'],
        mistakes: ['Bending the elbows so it becomes a press', 'Hands finishing too high (upper chest/shoulders take over)', 'Going too heavy and losing the stretch'] },
      '0155': { cues: ['Handles at chest height, slight elbow bend', 'Hug motion, hands meet in front', 'Slow on the way back'],
        mistakes: ['Pressing instead of hugging', 'Too heavy', 'Leaning far forward'] },
      '0596': { cues: ['Seat height puts the handles at mid-chest', 'Keep a slight, fixed bend in the elbows', 'Squeeze for 1 s'],
        mistakes: ['Letting the stack slam between reps', 'Shoulders rolling forward at the end', 'Stretching back into pain'] },
      '0194': { cues: ['Face away from the stack, elbows pointing forward and up', 'Deep stretch behind the head', 'Lock out fully'],
        mistakes: ['Elbows flaring wide', 'Arching the lower back', 'Turning it into a press'] },
      '0060': { cues: ['Upper arms still, angled slightly back', 'Lower toward the forehead', 'Extend fully'],
        mistakes: ['Elbows flaring out', 'Moving the upper arms (turns into a press)', 'Going too heavy (elbow pain)'] },
      '0200': { cues: ['Elbows pinned to your sides', 'Spread the rope and lock out at the bottom', 'Control the way up'],
        mistakes: ['Elbows drifting forward (turns into a press)', 'Leaning over the stack', 'Using body momentum'] },
      '0241': { cues: ['Elbows pinned to your sides', 'Lock out fully', 'Stand tall'],
        mistakes: ['Elbows drifting forward', 'Leaning over the stack', 'Using momentum'] },
      '0201': { cues: ['Overhand grip, shoulder-width on the straight bar', 'Elbows locked at your sides', 'Push down until the arms are straight, 1 s squeeze'],
        mistakes: ['Elbows flaring or moving forward', 'Wrists bending back', 'Letting the bar fly up past chest height'] },
      '0207': { cues: ['Underhand grip, elbows tight', 'Push down to full lockout', 'Slow on the way up'],
        mistakes: ['Too heavy (wrists hurt)', 'Elbows moving', 'Leaning over the bar'] },
      '0150': { cues: ['Grip a little wider than the shoulders, chest up', 'Drive the elbows down to the ribs', 'Full stretch at the top'],
        mistakes: ['Pulling behind the neck', 'Leaning far back (turns into a row)', 'Using momentum'] },
      '0818': { cues: ['Neutral grip, chest up', 'Elbows down to the ribs', 'Full stretch at the top'],
        mistakes: ['Leaning far back', 'Using momentum', 'Shrugging'] },
      '2616': { cues: ['V-bar handle, sit tall with a slight lean back', 'Pull the handle to the upper chest', 'Let the lats stretch fully at the top'],
        mistakes: ['Rocking the torso to move the weight', 'Stopping short of a full stretch', 'Pulling with the biceps only'] },
      '0245': { cues: ['Palms facing you, shoulder-width', 'Elbows drive down and back', 'Squeeze the lats at the bottom'],
        mistakes: ['Leaning far back', 'Half reps', 'Shrugging at the top'] },
      '0861': { cues: ['Sit tall with the chest up', 'Let the arms stretch forward, then row to the belly', 'Squeeze shoulder blades for 1 s'],
        mistakes: ['Big torso rocking', 'Slumping forward at the stretch', 'Pulling with the arms only'] },
      '1350': { cues: ['Chest on the pad', 'Pull the elbows back', 'Squeeze for 1 s'],
        mistakes: ['Chest leaving the pad', 'Jerking the handles', 'Shrugging'] },
      '0292': { cues: ['Flat back, free hand and knee on the bench', 'Pull the dumbbell to your hip', 'Full stretch at the bottom'],
        mistakes: ['Twisting the torso to lift', 'Shrugging', 'Rounding the back'] },
      '0031': { cues: ['Shoulder-width grip, elbows at your sides', 'Curl without moving the elbows forward', 'Take 2–3 s on the way down'],
        mistakes: ['Swinging with the hips and back', 'Elbows travelling forward', 'Cutting the bottom half of the rep'] },
      '0447': { cues: ['Elbows pinned to your sides', 'No hip swing', 'Take 2–3 s on the way down'],
        mistakes: ['Swinging with the back', 'Elbows travelling forward', 'Dropping the bar quickly'] },
      '0868': { cues: ['Elbows fixed', 'Squeeze at the top', 'Slow on the way down'],
        mistakes: ['Swinging', 'Elbows moving forward', 'Leaning back'] },
      '0070': { cues: ['Armpits snug on the top of the pad', 'Lower until the arms are almost straight', 'Curl up without lifting the elbows off the pad'],
        mistakes: ['Dropping fast to the bottom (elbow strain)', 'Shoulders rolling forward to finish the rep', 'Elbows lifting off the pad'] },
      '0592': { cues: ['Seat height puts the elbows on the pivot line', 'Full stretch at the bottom', 'Squeeze at the top'],
        mistakes: ['Half reps', 'Lifting the elbows', 'Jerking the weight'] },
      '0372': { cues: ['One arm at a time, elbow on the pad', 'Full stretch at the bottom', 'Slow on the way down'],
        mistakes: ['Dropping fast', 'Twisting the torso', 'Partial reps'] },
      '0318': { cues: ['Bench at about 45–60°, arms hang straight down', 'Keep the elbows behind the body while curling', 'Full stretch at the bottom'],
        mistakes: ['Elbows swinging forward', 'Head and shoulders lifting off the bench', 'Going too heavy and shortening the range'] },
      '0313': { cues: ['Palms face each other', 'Elbows stay still', 'Control the way down'],
        mistakes: ['Swinging', 'Shrugging the shoulders', 'Partial reps'] },
      '0294': { cues: ['Elbows fixed at your sides', 'Turn the palms up at the top', 'Take 2–3 s on the way down'],
        mistakes: ['Swinging', 'Elbows moving forward', 'Partial reps'] }
    }
  };
})();
