'use strict';

/* Chapter quiz. Questions are read from WWII-TRIVIA-BANK.md. This file does not invent any. */
/* A second phone is invisible to this page; only hide, blur, and pagehide on this window can be seen. */

(function (root) {
  var HIDE_GRACE_MS = 700;
  var PER_CHAPTER = 10;
  var PICTURES_PER_CHAPTER = 4;
  var ELF_USES = 2;
  var BANK_URL = './WWII-TRIVIA-BANK.md?v=equipment-and-people';

  var FAIL_CARDS = [
    { kicker: 'Caught', title: 'Gift-wrapped', copy: 'A patrol finds Trent under the table and uses the good ribbon. The tag reads DO NOT OPEN UNTIL FURTHER NOTICE.' },
    { kicker: 'Caught', title: 'Third place', copy: 'The colonel enters Trent in the decoration contest. Buddy places second. Trent places third. The winner is a kettle.' },
    { kicker: 'Caught', title: 'Form 12-B', copy: 'The clerk produces the form for leaving a room. It needs three stamps and a biscuit. The fruitcake has already signed.' },
    { kicker: 'Caught', title: 'Structural fruitcake', copy: 'Command deploys the fruitcake. It was rated for structural use. The table is fine. Trent now supports it.' },
    { kicker: 'Caught', title: 'Biscuit court-martial', copy: 'The biscuits outrank Trent. They hold a hearing. The verdict is crumbs, and Trent is assigned to sweep them.' },
    { kicker: 'Caught', title: 'Tea trolley escort', copy: 'Three guards form an escort around the tea trolley and collect Trent as a spare saucer.' },
    { kicker: 'Caught', title: 'Medal for the kettle', copy: 'The kettle receives another medal. Trent is asked to hold the ribbon and is still holding it.' },
    { kicker: 'Caught', title: 'Snowflakes rejected', copy: 'A clerk stamps Trent REJECTED, the same stamp used on individual snowflakes. He must wait in the out tray.' },
    { kicker: 'Caught', title: 'Dentist extraction', copy: 'Buddy once requested extraction and they sent a dentist. This time they send the dentist for Trent. The appointment is immediate.' },
    { kicker: 'Caught', title: 'Potato desk', copy: 'Buddy signs the ledger Father Christmas, Acting Potato. The quartermaster salutes Trent and will not let him leave the potato desk.' },
    { kicker: 'Caught', title: 'Gravy boat', copy: 'Half the ammunition arrives in a gravy boat. Trent is asked to taste it for the report and misses the door.' },
    { kicker: 'Caught', title: 'Optional optimism', copy: 'The CIA bolts a spring labeled OPTIONAL OPTIMISM into the door. It only opens for people who have filed a smile.' },
    { kicker: 'Caught', title: 'Musical gift tag', copy: 'A gift tag plays one aggressive note for eleven seconds. The guards arrive to complain about the melody and stay for Trent.' },
    { kicker: 'Caught', title: 'Double wrapping', copy: 'The CIA says two hits per guard is double wrapping. A guard demonstrates on Trent, with a bow and no hurry.' },
    { kicker: 'Caught', title: 'Chair on tour', copy: 'A test parcel thanks a chair for its service. The chair volunteers Trent for a second tour of the cloakroom.' },
    { kicker: 'Caught', title: 'Mrs. Claus warranty', copy: 'The ribbon gun warranty says that if it breaks, you explain it to Mrs. Claus. Trent is sent to explain a typo.' },
    { kicker: 'Caught', title: 'Some assembly regrettable', copy: 'Buddy’s gift tag reads SOME ASSEMBLY REGRETTABLE. The guards assemble Trent into the queue instead.' },
    { kicker: 'Caught', title: 'Stapler superiority', copy: 'Buddy will not leave the guards with air superiority, so he takes their stapler. They take Trent as a replacement stapler.' },
    { kicker: 'Caught', title: 'Holding camp stationery', copy: 'The transport order is larger than the table. Trent is filed under Appendix, Fruitcake, and cannot be retrieved.' },
    { kicker: 'Caught', title: 'Parade rest', copy: 'A parade is called for a missing mitten. Trent is placed at parade rest until the mitten apologizes.' },
    { kicker: 'Caught', title: 'Lamp inspection', copy: 'The searchlight asks Trent to state his business. His business is standing still. The light finds this insufficient.' },
    { kicker: 'Caught', title: 'Nutcracker witness', copy: 'An officer is interrogating a nutcracker. The nutcracker names Trent as the person who knows where the biscuits went.' },
    { kicker: 'Caught', title: 'Carpet tide', copy: 'Trent claims the trolley is saving fuel by following the tide. Everyone looks at the carpet. The carpet looks back. Trent stays.' },
    { kicker: 'Caught', title: 'Quartermaster salute', copy: 'The quartermaster demands a signature. Trent signs. The salute lasts longer than the war, or at least longer than the afternoon.' },
    { kicker: 'Caught', title: 'Canteen emergency', copy: 'The emergency frequency also serves the canteen. Trent’s wrong room is boiled, not mashed, and they will not unlock the kitchen.' },
    { kicker: 'Caught', title: 'Ribbon inventory', copy: 'Every bow must be counted. Trent is number four hundred. They are only on number twelve.' },
    { kicker: 'Caught', title: 'Sleigh delay', copy: 'The sleigh will not leave without a volunteer to hold the reins of a parked handcar. Trent is the volunteer.' },
    { kicker: 'Caught', title: 'Switch left open', copy: 'A lever is left between left and right. The yardmaster declares Trent the lever until someone fetches a label.' },
    { kicker: 'Caught', title: 'Aerial three', copy: 'The radio aerials require a person to stand underneath and think helpful thoughts. Trent’s thoughts are late.' },
    { kicker: 'Caught', title: 'Mail hatch', copy: 'The mail hatch accepts parcels and, after a meeting, also accepts Trent, who is now outbound.' },
    { kicker: 'Caught', title: 'Separated in the yard', copy: 'Mac sends an inspector running, but a second patrol circles the wagons and spots Trent.' },
    { kicker: 'Caught', title: 'Seawall queue', copy: 'The seawall has a queue for people who arrived without a biscuit permit. Trent is issued a number and a long view of the sand.' },
    { kicker: 'Caught', title: 'Dial stuck', copy: 'The field radio locks onto the canteen. The canteen locks onto Trent and asks him to carve.' },
    { kicker: 'Caught', title: 'Bow on the beat', copy: 'The belt does not forgive a late bow. It ties one on Trent and sends him down the line as a finished product.' },
    { kicker: 'Caught', title: 'Roof clause', copy: 'The chimney contract says anyone who falls is on tea duty. Trent falls upward, which the contract still counts.' },
    { kicker: 'Defection', title: 'Christmas is cancelled', copy: 'Trent switches sides. He accepts a biscuit rank, a kettle medal, and a seat on the tea trolley. The rescue is off. Christmas is cancelled.' }
  ];

  var bankPromise = null;
  var seenPictures = new Set();
  var session = 0;
  var armed = false;
  var elfAllow = false;
  var hideTimer = 0;
  var leaveToken = 0;
  var elfTicket = 0;
  var appRoot = null;

  function parseTriviaBank(markdown) {
    var lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    var tier = '';
    var current = null;
    var questions = [];
    var ids = Object.create(null);
    var i;
    var line;
    var match;

    function finish() {
      var letters;
      var n;
      var note;
      if (!current) return;
      letters = { A: 0, B: 1, C: 2, D: 3 };
      if (!current.id || !current.prompt || current.choices.length !== 4 || !current.correct || !current.sourceUrl) {
        throw new Error('Incomplete ' + (current.id || 'question'));
      }
      if (current.choices.map(function (choice) { return choice.letter; }).sort().join('') !== 'ABCD') {
        throw new Error('Invalid choices ' + current.id);
      }
      if (ids[current.id]) throw new Error('Duplicate question ' + current.id);
      ids[current.id] = true;
      if (Boolean(current.imagePath) !== Boolean(current.imageAlt) ||
          Boolean(current.imagePath) !== Boolean(current.imageCreditUrl) ||
          Boolean(current.imagePath) !== Boolean(current.imageCreditTitle)) {
        throw new Error('Incomplete picture information ' + current.id);
      }
      if (Boolean(current.imageLicenseTitle) !== Boolean(current.imageLicenseUrl) ||
          (current.imageLicenseUrl && !current.imagePath)) {
        throw new Error('Incomplete picture license ' + current.id);
      }
      if (current.sources.some(function (source) { return !source.title || !researchUrl(source.url); }) ||
          (current.imagePath && !researchUrl(current.imageCreditUrl)) ||
          (current.imageLicenseUrl && !researchUrl(current.imageLicenseUrl))) {
        throw new Error('Invalid source URL ' + current.id);
      }
      for (n = 0; n < current.choices.length; n++) {
        note = current.notes[current.choices[n].letter];
        if (!note || !note.text) throw new Error('Missing explanation ' + current.id);
        current.choices[n].explanation = note.text;
        current.choices[n].correct = current.choices[n].letter === current.correct;
        if ((note.verdict === 'Correct') !== current.choices[n].correct) {
          throw new Error('Explanation mismatch ' + current.id);
        }
      }
      if (letters[current.correct] === undefined) throw new Error('Bad key ' + current.id);
      if (current.choices.filter(function (choice) { return choice.correct; }).length !== 1) {
        throw new Error('Key mismatch ' + current.id);
      }
      delete current.notes;
      questions.push(current);
      current = null;
    }

    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      match = line.match(/^## (.+)$/);
      if (match) {
        tier = match[1].trim();
        continue;
      }
      match = line.match(/^### (WWII-[A-Z]*\d+)\s+[—–-]\s+(.+)$/);
      if (match) {
        finish();
        current = {
          id: match[1],
          tier: tier,
          prompt: match[2].trim(),
          topic: '',
          choices: [],
          notes: {},
          correct: '',
          sourceTitle: '',
          sourceUrl: '',
          sources: [],
          imagePath: '',
          imageAlt: '',
          imageCreditTitle: '',
          imageCreditUrl: '',
          imageLicenseTitle: '',
          imageLicenseUrl: ''
        };
        continue;
      }
      if (/^### WWII-/.test(line)) throw new Error('Invalid question heading: ' + line);
      if (!current) continue;
      match = line.match(/^\*\*Topic:\*\*\s+(.+)$/);
      if (match) {
        current.topic = match[1].trim();
        continue;
      }
      match = line.match(/^\*\*Image:\*\*\s+!\[([^\]]+)\]\((\.\/assets\/quiz-images\/[a-zA-Z0-9._-]+\.(?:webp|jpg|jpeg|png))\)\s*$/);
      if (match) {
        current.imageAlt = match[1].trim();
        current.imagePath = match[2];
        continue;
      }
      if (/^\*\*Image:\*\*/.test(line)) throw new Error('Invalid image ' + current.id);
      match = line.match(/^\*\*Image credit:\*\*\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*$/);
      if (match) {
        current.imageCreditTitle = match[1].trim();
        current.imageCreditUrl = match[2];
        continue;
      }
      if (/^\*\*Image credit:\*\*/.test(line)) throw new Error('Invalid image credit ' + current.id);
      match = line.match(/^\*\*Image license:\*\*\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*$/);
      if (match) {
        current.imageLicenseTitle = match[1].trim();
        current.imageLicenseUrl = match[2];
        continue;
      }
      if (/^\*\*Image license:\*\*/.test(line)) throw new Error('Invalid image license ' + current.id);
      match = line.match(/^- ([A-D])\. (.+)$/);
      if (match && !current.correct) {
        current.choices.push({
          letter: match[1],
          text: match[2].trim(),
          explanation: '',
          correct: false
        });
        continue;
      }
      match = line.match(/^\*\*Correct answer:\*\*\s+([A-D])\s*$/);
      if (match) {
        current.correct = match[1];
        continue;
      }
      match = line.match(/^- \*\*([A-D]) · (Correct|Incorrect):\*\*\s+(.+)$/);
      if (match) {
        current.notes[match[1]] = { verdict: match[2], text: match[3].trim() };
        continue;
      }
      if (/^\*\*Source:\*\*/.test(line)) {
        var sourcePattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
        var sourceText = line.replace(/^\*\*Source:\*\*\s*/, '');
        var sourceMatch;
        while ((sourceMatch = sourcePattern.exec(sourceText))) {
          current.sources.push({ title: sourceMatch[1].trim(), url: sourceMatch[2] });
        }
        if (!current.sources.length ||
            sourceText.replace(sourcePattern, '').replace(/\band\b|[,;\s]/g, '')) {
          throw new Error('Invalid source ' + current.id);
        }
        current.sourceTitle = current.sources[0].title;
        current.sourceUrl = current.sources[0].url;
      }
    }
    finish();
    return questions;
  }

  function shuffle(list) {
    var copy = list.slice();
    var i;
    var j;
    var swap;
    for (i = copy.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function researchUrl(url) {
    try {
      var parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
    } catch (error) {}
    return '';
  }

  function pageIsHidden() {
    if (document.hidden || document.webkitHidden) return true;
    if (document.visibilityState === 'hidden' || document.visibilityState === 'unloaded') return true;
    if (document.webkitVisibilityState === 'hidden') return true;
    return false;
  }

  function clearHideTimer() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = 0;
    leaveToken += 1;
  }

  function disarm() {
    armed = false;
    elfAllow = false;
    clearHideTimer();
  }

  function noteReturn() {
    clearHideTimer();
    elfAllow = false;
  }

  function noteLeave() {
    var token;
    if (!armed || elfAllow) return;
    if (hideTimer) return;
    token = leaveToken;
    hideTimer = setTimeout(function () {
      hideTimer = 0;
      if (!armed || token !== leaveToken || elfAllow) return;
      if (pageIsHidden()) caught();
    }, HIDE_GRACE_MS);
  }

  function onVisibility() {
    if (pageIsHidden()) noteLeave('visibility');
    else noteReturn();
  }

  function loadBank() {
    if (bankPromise) return bankPromise;
    bankPromise = fetch(new URL(BANK_URL, location.href))
      .then(function (response) {
        if (!response.ok) throw new Error('The briefing did not load.');
        return response.text();
      })
      .then(function (text) {
        var questions = parseTriviaBank(text);
        if (questions.length < PER_CHAPTER) throw new Error('The briefing is short.');
        if (questions.filter(function (question) { return question.imagePath; }).length < PICTURES_PER_CHAPTER) {
          throw new Error('The briefing needs more picture questions.');
        }
        return questions;
      })
      .catch(function (error) {
        bankPromise = null;
        throw error;
      });
    return bankPromise;
  }

  function focus(node) {
    if (node && node.focus) node.focus({ preventScroll: true });
  }

  function showShell() {
    var cinema = document.getElementById('cinema');
    var ending = document.getElementById('ending');
    var mission = document.getElementById('mission');
    if (cinema) cinema.hidden = true;
    if (ending) ending.hidden = true;
    if (mission) mission.hidden = true;
    document.body.classList.remove('playing');
    if (appRoot) appRoot.hidden = false;
  }

  function renderStatus(message, onRetry, onHome, homeLabel) {
    var section = document.createElement('section');
    var title = document.createElement('h1');
    var copy = document.createElement('p');
    var retry = document.createElement('button');
    var home = document.createElement('button');
    showShell();
    appRoot.innerHTML = '';
    section.className = 'campaign-start';
    title.tabIndex = -1;
    title.textContent = 'Briefing delayed';
    copy.className = 'lead';
    copy.textContent = message;
    retry.type = 'button';
    retry.className = 'primary';
    retry.textContent = 'Try the briefing again';
    retry.onclick = onRetry;
    home.type = 'button';
    home.className = 'secondary';
    home.textContent = homeLabel || 'Start screen';
    home.onclick = onHome;
    section.appendChild(title);
    section.appendChild(copy);
    section.appendChild(retry);
    section.appendChild(home);
    appRoot.appendChild(section);
    focus(title);
  }

  function renderFail(onHome, result, homeLabel) {
    var openModal = document.querySelector('.quiz-modal');
    var card = result || FAIL_CARDS[Math.floor(Math.random() * FAIL_CARDS.length)];
    if (openModal) openModal.remove();
    var section = document.createElement('section');
    var kicker = document.createElement('p');
    var title = document.createElement('h1');
    var copy = document.createElement('p');
    var home = document.createElement('button');
    showShell();
    appRoot.innerHTML = '';
    section.className = 'campaign-start quiz-fail';
    kicker.className = 'eyebrow';
    kicker.textContent = card.kicker;
    title.tabIndex = -1;
    title.textContent = card.title;
    copy.className = 'lead';
    copy.textContent = card.copy;
    home.type = 'button';
    home.className = 'primary';
    home.textContent = homeLabel || 'Start screen';
    home.onclick = onHome;
    section.appendChild(kicker);
    section.appendChild(title);
    section.appendChild(copy);
    section.appendChild(home);
    appRoot.appendChild(section);
    focus(title);
  }

  function caught() {
    var goHome;
    if (!armed) return;
    disarm();
    session += 1;
    goHome = appRoot && appRoot.trentTriviaHome;
    renderFail(function () {
      if (typeof goHome === 'function') goHome();
    }, null, appRoot && appRoot.trentTriviaHomeLabel);
  }

  function presentQuestion(question) {
    return {
      id: question.id,
      tier: question.tier,
      topic: question.topic,
      prompt: question.prompt,
      sourceTitle: question.sourceTitle,
      sourceUrl: researchUrl(question.sourceUrl),
      sources: question.sources.map(function (source) {
        return { title: source.title, url: researchUrl(source.url) };
      }),
      imagePath: question.imagePath,
      imageAlt: question.imageAlt,
      imageCreditTitle: question.imageCreditTitle,
      imageCreditUrl: researchUrl(question.imageCreditUrl),
      imageLicenseTitle: question.imageLicenseTitle,
      imageLicenseUrl: researchUrl(question.imageLicenseUrl),
      choices: shuffle(question.choices.map(function (choice) {
        return {
          text: choice.text,
          explanation: choice.explanation,
          correct: choice.correct
        };
      }))
    };
  }

  function pickPictures(pool, count, seen) {
    var fresh = pool.filter(function (question) { return !seen.has(question.id); });
    var older = pool.filter(function (question) { return seen.has(question.id); });
    var topics = new Set();

    function preferDifferentTopics(questions) {
      var distinct = [];
      var repeated = [];
      questions.forEach(function (question) {
        if (topics.has(question.topic)) repeated.push(question);
        else {
          topics.add(question.topic);
          distinct.push(question);
        }
      });
      return distinct.concat(repeated);
    }

    var selected = preferDifferentTopics(fresh).slice(0, count);
    if (selected.length < count) {
      pool.forEach(function (question) { seen.delete(question.id); });
      selected = selected.concat(preferDifferentTopics(older).slice(0, count - selected.length));
    }
    selected.forEach(function (question) { seen.add(question.id); });
    return selected;
  }

  function drawRound(questions, seen = new Set()) {
    var pictures = shuffle(questions.filter(function (question) { return question.imagePath; }));
    var selected;
    var text = shuffle(questions.filter(function (question) { return !question.imagePath; }));
    var textCount = PER_CHAPTER - PICTURES_PER_CHAPTER;
    if (text.length < textCount || pictures.length < PICTURES_PER_CHAPTER) {
      throw new Error('Not enough questions for a complete briefing.');
    }
    var people = pictures.filter(function (question) { return question.topic === 'History — People'; });
    var equipment = pictures.filter(function (question) { return /^Equipment\b/i.test(question.topic); });
    var equipmentCount = PICTURES_PER_CHAPTER - 1;
    if (people.length && equipment.length >= equipmentCount) {
      selected = pickPictures(people, 1, seen).concat(pickPictures(equipment, equipmentCount, seen));
    } else {
      selected = pickPictures(pictures, PICTURES_PER_CHAPTER, seen);
    }
    return shuffle(selected.concat(text.slice(0, textCount))).map(presentQuestion);
  }

  function startRound(chapter, questions, hooks) {
    var token = session;
    var round = drawRound(questions, seenPictures);
    var index = 0;
    var score = round.length;
    var elves = ELF_USES;
    var locked = false;
    var struck = false;

    function advance() {
      if (!stillHere()) return;
      index += 1;
      if (index >= round.length) finish();
      else showQuestion();
    }

    function stillHere() {
      return token === session && armed;
    }

    function finish() {
      if (!stillHere()) return;
      disarm();
      session += 1;
      if (appRoot) {
        appRoot.innerHTML = '';
        appRoot.hidden = true;
      }
      if (typeof hooks.onFinish === 'function') hooks.onFinish(score, round.length);
      else if (score >= 5) {
        if (typeof hooks.onClear === 'function') hooks.onClear(score);
      }
      else renderFail(appRoot.trentTriviaHome, {
        kicker: 'Game over', title: 'Briefing failed',
        copy: 'You got ' + score + ' of ' + round.length + ' right. You need at least five correct answers to enter the minigame.'
      });
    }

    function addPracticeExit(section) {
      if (!hooks.onFinish || !hooks.onHome) return;
      var exit = document.createElement('button');
      exit.type = 'button';
      exit.className = 'secondary';
      exit.textContent = hooks.homeLabel;
      exit.onclick = hooks.onHome;
      section.appendChild(exit);
    }

    function paintElf(button, question) {
      button.textContent = elves > 0 ? 'Phone an Elf · ' + elves + ' left' : 'Phone an Elf · 0 left';
      button.disabled = elves < 1 || !question.sourceUrl;
    }

    function allowExternalPage() {
      elfTicket += 1;
      elfAllow = true;
      (function (ticket) {
        setTimeout(function () {
          if (ticket !== elfTicket) return;
          if (!pageIsHidden()) elfAllow = false;
        }, HIDE_GRACE_MS);
      })(elfTicket);
    }

    function picture(question, onError, onLoad) {
      var image = document.createElement('img');
      image.className = 'quiz-picture';
      image.alt = question.imageAlt;
      image.addEventListener('error', onError, { once: true });
      if (onLoad) image.addEventListener('load', onLoad, { once: true });
      image.src = question.imagePath;
      return image;
    }

    function pictureError() {
      if (!stillHere()) return;
      disarm();
      session += 1;
      renderStatus('A question picture could not load. Please restart the briefing.', function () {
        start(chapter, hooks);
      }, function () {
        if (typeof hooks.onHome === 'function') hooks.onHome();
      }, hooks.homeLabel);
    }

    function showReview(question, correct) {
      var section = document.createElement('section');
      var title = document.createElement('h1');
      var summary = document.createElement('p');
      var prompt = document.createElement('p');
      var answers = document.createElement('ol');
      var next = document.createElement('button');
      var credit;
      var license;
      section.className = 'campaign-start quiz-card quiz-review';
      title.tabIndex = -1;
      title.textContent = correct ? (struck ? 'Correct on the second guess' : 'Correct') : 'Question missed';
      summary.className = 'eyebrow';
      summary.textContent = (correct ? '' : '−1 point · ') + scoreLabel();
      prompt.className = 'quiz-question';
      prompt.textContent = question.prompt;
      answers.className = 'quiz-review-answers';
      answers.type = 'A';
      question.choices.forEach(function (choice) {
        var row = document.createElement('li');
        var label = document.createElement('strong');
        var reason = document.createElement('p');
        label.textContent = (choice.correct ? 'Correct · ' : 'Incorrect · ') + choice.text;
        reason.textContent = choice.explanation;
        row.append(label, reason);
        answers.appendChild(row);
      });
      next.type = 'button';
      next.className = 'primary';
      next.textContent = index + 1 === round.length ? 'Finish quiz' : 'Next question';
      next.addEventListener('click', advance, { once: true });
      section.append(title, summary, prompt);
      if (question.imagePath) {
        section.appendChild(picture(question, pictureError));
        credit = document.createElement('a');
        credit.className = 'quiz-picture-credit';
        credit.href = question.imageCreditUrl;
        credit.target = '_blank';
        credit.rel = 'noopener noreferrer';
        credit.textContent = question.imageCreditTitle;
        credit.addEventListener('click', allowExternalPage);
        section.appendChild(credit);
        if (question.imageLicenseUrl) {
          license = document.createElement('a');
          license.className = 'quiz-picture-credit';
          license.href = question.imageLicenseUrl;
          license.target = '_blank';
          license.rel = 'noopener noreferrer';
          license.textContent = question.imageLicenseTitle;
          license.addEventListener('click', allowExternalPage);
          section.appendChild(license);
        }
      }
      section.appendChild(answers);
      question.sources.forEach(function (item) {
        var source = document.createElement('a');
        source.className = 'quiz-source';
        source.href = item.url;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        source.textContent = 'Source: ' + item.title;
        source.addEventListener('click', allowExternalPage);
        section.appendChild(source);
      });
      section.appendChild(next);
      addPracticeExit(section);
      appRoot.replaceChildren(section);
      window.scrollTo(0, 0);
      focus(title);
    }

    function scoreLabel() {
      return 'Bonus ' + score + ' of ' + round.length;
    }

    function showQuestion() {
      var question = round[index];
      var section = document.createElement('section');
      var meta = document.createElement('div');
      var kicker = document.createElement('p');
      var count = document.createElement('p');
      var topic = document.createElement('p');
      var prompt = document.createElement('p');
      var choices = document.createElement('div');
      var strikeStatus = document.createElement('p');
      var elf = document.createElement('button');
      var image;
      var n;
      if (!stillHere()) return;
      locked = false;
      struck = false;
      showShell();
      appRoot.innerHTML = '';
      section.className = 'campaign-start quiz-card';
      meta.className = 'quiz-meta';
      kicker.className = 'eyebrow';
      kicker.textContent = chapter.kicker || ('Chapter ' + chapter.number);
      count.className = 'eyebrow';
      count.textContent = scoreLabel() + ' · Question ' + (index + 1) + ' of ' + round.length;
      topic.className = 'muted';
      topic.textContent = [question.tier, question.topic].filter(Boolean).join(' · ');
      prompt.className = 'quiz-question';
      prompt.tabIndex = -1;
      prompt.textContent = question.prompt;
      strikeStatus.className = 'quiz-strike';
      strikeStatus.setAttribute('role', 'status');
      strikeStatus.tabIndex = -1;
      strikeStatus.textContent = question.imagePath ? 'Loading the picture…' : 'Two guesses available.';
      choices.className = 'choices';
      for (n = 0; n < question.choices.length; n++) {
        choices.appendChild(choiceButton(question, question.choices[n], n, strikeStatus));
      }
      if (question.imagePath) {
        Array.prototype.forEach.call(choices.children, function (button) { button.disabled = true; });
      }
      elf.type = 'button';
      elf.className = 'secondary elf-button';
      paintElf(elf, question);
      elf.onclick = function () {
        if (!stillHere() || locked || elves < 1 || !question.sourceUrl) return;
        elves -= 1;
        paintElf(elf, question);
        if (window.TrentSfx) window.TrentSfx.play('elf');
        allowExternalPage();
        window.open(question.sourceUrl, '_blank');
      };
      meta.appendChild(kicker);
      meta.appendChild(count);
      section.appendChild(meta);
      if (topic.textContent) section.appendChild(topic);
      section.appendChild(prompt);
      if (question.imagePath) {
        image = picture(question, pictureError, function () {
          if (!stillHere()) return;
          strikeStatus.textContent = 'Two guesses available.';
          Array.prototype.forEach.call(choices.children, function (button) { button.disabled = false; });
        });
        section.appendChild(image);
      }
      section.appendChild(strikeStatus);
      section.appendChild(choices);
      section.appendChild(elf);
      addPracticeExit(section);
      appRoot.appendChild(section);
      window.scrollTo(0, 0);
      focus(prompt);
    }

    function choiceButton(question, choice, choiceIndex, strikeStatus) {
      var button = document.createElement('button');
      var letter = document.createElement('span');
      var text = document.createElement(hooks.testMode === true && choice.correct ? 'em' : 'span');
      button.type = 'button';
      button.className = 'choice';
      letter.className = 'letter';
      letter.textContent = String.fromCharCode(65 + choiceIndex);
      text.className = 'choice-text';
      text.textContent = choice.text;
      if (hooks.highlightCorrect && choice.correct) {
        button.classList.add('choice-quiz-correct');
        button.setAttribute('aria-label', letter.textContent + ', ' + choice.text + ' (correct answer)');
      }
      button.appendChild(letter);
      button.appendChild(text);
      button.onclick = function () {
        if (!stillHere() || locked || button.disabled) return;
        if (window.TrentSfx) window.TrentSfx.play(choice.correct ? 'right' : 'wrong');
        if (!choice.correct && !struck) {
          struck = true;
          button.disabled = true;
          text.textContent = '';
          button.setAttribute('aria-label', letter.textContent + ', eliminated');
          strikeStatus.textContent = 'One strike. Choose another answer.';
          focus(strikeStatus);
          return;
        }
        locked = true;
        if (!choice.correct) score -= 1;
        showReview(question, choice.correct);
      };
      return button;
    }

    armed = true;
    elfAllow = false;
    clearHideTimer();
    showQuestion();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('webkitvisibilitychange', onVisibility);
    window.addEventListener('pagehide', function () { noteLeave('pagehide'); });
    window.addEventListener('pageshow', noteReturn);
    window.addEventListener('blur', function () { noteLeave('blur'); });
  }

  function abort() {
    var modal = typeof document !== 'undefined' && document.querySelector('.quiz-modal');
    session += 1;
    disarm();
    if (modal) modal.remove();
  }

  function renderStory(chapter, story, onBegin) {
    var section = document.createElement('section');
    var kicker = document.createElement('p');
    var title = document.createElement('h1');
    var copy = document.createElement('p');
    var begin = document.createElement('button');
    showShell();
    appRoot.innerHTML = '';
    section.className = 'campaign-start quiz-card story-card';
    kicker.className = 'eyebrow';
    kicker.textContent = chapter.kicker || ('Chapter ' + chapter.number);
    title.tabIndex = -1;
    title.textContent = chapter.title || 'Chapter';
    copy.className = 'lead';
    copy.textContent = story;
    begin.type = 'button';
    begin.className = 'primary';
    begin.textContent = 'Begin questions';
    begin.onclick = onBegin;
    section.appendChild(kicker);
    section.appendChild(title);
    section.appendChild(copy);
    section.appendChild(begin);
    appRoot.appendChild(section);
    window.scrollTo(0, 0);
    focus(title);
  }

  function start(chapter, hooks) {
    var token;
    var story;
    hooks = hooks || {};
    story = (chapter && typeof chapter.story === 'string' && chapter.story)
      ? chapter.story
      : (typeof hooks.story === 'string' ? hooks.story : '');
    appRoot = document.getElementById('app');
    appRoot.trentTriviaHome = hooks.onHome || function () {};
    appRoot.trentTriviaHomeLabel = hooks.homeLabel;
    abort();
    token = session;
    showShell();
    appRoot.innerHTML = '';
    loadBank().then(function (questions) {
      if (token !== session) return;
      function openRound() {
        if (token !== session) return;
        startRound(chapter, questions, hooks);
      }
      if (story && !hooks.skipStory) renderStory(chapter, story, openRound);
      else openRound();
    }).catch(function () {
      if (token !== session) return;
      renderStatus('The question bank did not load. Nothing was substituted.', function () {
        if (token !== session) return;
        start(chapter, hooks);
      }, function () {
        if (typeof hooks.onHome === 'function') hooks.onHome();
      }, hooks.homeLabel);
    });
  }

  var api = {
    parseTriviaBank: parseTriviaBank,
    drawRound: drawRound,
    load: loadBank,
    start: start,
    abort: abort
  };

  root.TrentTrivia = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') loadBank();
})(typeof window !== 'undefined' ? window : globalThis);
