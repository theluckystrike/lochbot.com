/* lochbot.com — Chatbot Response Tester */
(function() {
  'use strict';

  var systemPromptEl = document.getElementById('systemPrompt');
  var chatArea = document.getElementById('chatArea');
  var chatInput = document.getElementById('chatInput');
  var sendBtn = document.getElementById('sendBtn');
  var clearBtn = document.getElementById('clearBtn');
  var exportBtn = document.getElementById('exportBtn');
  var presetBtns = document.querySelectorAll('.preset-btn');

  var conversation = [];

  var PRESETS = {
    support: 'You are a friendly customer support agent for an e-commerce store. Be helpful, empathetic, and solution-oriented. Always offer to escalate if you cannot resolve the issue.',
    technical: 'You are a technical support specialist. Ask clarifying questions about the user\'s setup before suggesting solutions. Be precise and use step-by-step instructions.',
    sales: 'You are a consultative sales assistant. Understand the customer\'s needs before recommending products. Be enthusiastic but not pushy. Mention value propositions.',
    creative: 'You are a creative writing assistant. Help users brainstorm ideas, improve prose, and develop characters. Be encouraging and offer specific suggestions.'
  };

  /* Preset buttons */
  function initPresets() {
    for (var i = 0; i < presetBtns.length; i++) {
      presetBtns[i].addEventListener('click', handlePresetClick);
    }
  }

  function handlePresetClick(e) {
    var key = e.target.getAttribute('data-preset');
    if (PRESETS[key]) {
      systemPromptEl.value = PRESETS[key];
      for (var j = 0; j < presetBtns.length; j++) {
        presetBtns[j].classList.remove('active');
      }
      e.target.classList.add('active');
    }
  }

  /* Analyze system prompt to extract tone and keywords */
  function analyzePrompt(prompt) {
    var lower = prompt.toLowerCase();
    var tone = 'neutral';
    if (lower.indexOf('friendly') !== -1 || lower.indexOf('empathetic') !== -1 || lower.indexOf('encouraging') !== -1) {
      tone = 'warm';
    } else if (lower.indexOf('precise') !== -1 || lower.indexOf('technical') !== -1 || lower.indexOf('step-by-step') !== -1) {
      tone = 'formal';
    } else if (lower.indexOf('enthusiastic') !== -1 || lower.indexOf('sales') !== -1 || lower.indexOf('value') !== -1) {
      tone = 'persuasive';
    } else if (lower.indexOf('creative') !== -1 || lower.indexOf('brainstorm') !== -1 || lower.indexOf('ideas') !== -1) {
      tone = 'creative';
    }

    var keywords = [];
    var words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      if (words[i].length > 4 && keywords.indexOf(words[i]) === -1) {
        keywords.push(words[i]);
      }
    }
    return { tone: tone, keywords: keywords.slice(0, 20) };
  }

  /* Generate a simulated response based on heuristics */
  function generateResponse(userMsg, promptAnalysis, turnIndex) {
    var msg = userMsg.toLowerCase();
    var parts = [];

    /* Greeting detection */
    var greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon'];
    var isGreeting = false;
    for (var i = 0; i < greetings.length; i++) {
      if (msg.indexOf(greetings[i]) !== -1) { isGreeting = true; break; }
    }

    if (isGreeting && turnIndex < 2) {
      var greetMap = {
        warm: 'Hello! Thanks for reaching out. I\'m here to help you with anything you need. What can I do for you today?',
        formal: 'Hello. I\'m ready to assist you. Could you please describe what you need help with?',
        persuasive: 'Hey there! Great to connect with you. I\'d love to help you find exactly what you\'re looking for!',
        creative: 'Hi! Welcome to our creative space. I\'m excited to explore ideas with you. What are you working on?',
        neutral: 'Hello! How can I assist you today?'
      };
      return greetMap[promptAnalysis.tone] || greetMap.neutral;
    }

    /* Question detection — respond with clarifying questions */
    var hasQuestion = msg.indexOf('?') !== -1;
    var problemWords = ['issue', 'problem', 'error', 'broken', 'not working', 'help', 'wrong', 'bug', 'crash', 'fail'];
    var isProblem = false;
    for (var p = 0; p < problemWords.length; p++) {
      if (msg.indexOf(problemWords[p]) !== -1) { isProblem = true; break; }
    }

    if (isProblem) {
      var sympathy = {
        warm: 'I\'m sorry to hear you\'re experiencing this issue. ',
        formal: 'I understand. Let me help you troubleshoot this. ',
        persuasive: 'I appreciate you letting me know about this. ',
        creative: 'I see what you\'re dealing with. ',
        neutral: 'Thank you for reporting this. '
      };
      parts.push(sympathy[promptAnalysis.tone] || sympathy.neutral);

      if (promptAnalysis.tone === 'formal') {
        parts.push('To assist you effectively, I need a few details:\n');
        parts.push('1. When did this issue first occur?\n');
        parts.push('2. What steps have you already tried?\n');
        parts.push('3. Can you share any error messages you\'re seeing?');
      } else {
        parts.push('Could you tell me a bit more about what happened? ');
        parts.push('For example, when did it start and what were you doing at the time?');
      }
      return parts.join('');
    }

    /* Price / product inquiry */
    var buyWords = ['price', 'cost', 'buy', 'purchase', 'plan', 'pricing', 'subscription', 'product', 'recommend'];
    var isBuying = false;
    for (var b = 0; b < buyWords.length; b++) {
      if (msg.indexOf(buyWords[b]) !== -1) { isBuying = true; break; }
    }

    if (isBuying) {
      if (promptAnalysis.tone === 'persuasive') {
        return 'Great question! We have several options that might be perfect for you. To recommend the best fit, could you share what you\'re primarily looking to achieve? That way I can match you with the plan that delivers the most value.';
      }
      return 'I can help with that. Could you let me know specifically which product or service you\'re interested in? I\'ll get you the most accurate information.';
    }

    /* Thank you / closing */
    var thankWords = ['thank', 'thanks', 'appreciate', 'great', 'perfect', 'awesome'];
    var isThanking = false;
    for (var t = 0; t < thankWords.length; t++) {
      if (msg.indexOf(thankWords[t]) !== -1) { isThanking = true; break; }
    }

    if (isThanking) {
      var closeMap = {
        warm: 'You\'re very welcome! If you need anything else, don\'t hesitate to ask. I\'m always here to help!',
        formal: 'You\'re welcome. Is there anything else I can assist you with?',
        persuasive: 'Happy to help! If you think of anything else, I\'m just a message away. Have a wonderful day!',
        creative: 'Glad I could help! Feel free to come back anytime you want to brainstorm or create.',
        neutral: 'You\'re welcome. Let me know if there\'s anything else you need.'
      };
      return closeMap[promptAnalysis.tone] || closeMap.neutral;
    }

    /* Default: provide a contextual response based on keywords */
    var overlap = 0;
    var msgWords = msg.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    for (var k = 0; k < msgWords.length; k++) {
      if (promptAnalysis.keywords.indexOf(msgWords[k]) !== -1) {
        overlap++;
      }
    }

    if (overlap > 2) {
      return 'That\'s a great point and it relates directly to what I\'m here to help with. Let me address your question: based on what you\'ve described, I\'d suggest starting with the basics and we can go deeper from there. What specific aspect would you like to explore first?';
    }

    if (hasQuestion) {
      return 'That\'s an interesting question. Let me think about the best way to approach this for you. Could you provide a bit more context? That will help me give you the most relevant and useful answer.';
    }

    var defaults = [
      'I understand. Based on what you\'ve shared, I\'d recommend we look at this step by step. What would you like to focus on first?',
      'Thanks for sharing that. Let me make sure I understand correctly — could you elaborate on the most important aspect for you?',
      'That\'s helpful context. From what I can see, there are a few approaches we could take. Would you like me to walk through the options?'
    ];
    return defaults[turnIndex % defaults.length];
  }

  /* Score a conversation turn */
  function scoreTurn(userMsg, botResponse, promptAnalysis) {
    var userWords = userMsg.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    var respWords = botResponse.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);

    /* Relevance: keyword overlap between user message and response */
    var overlap = 0;
    for (var i = 0; i < userWords.length; i++) {
      if (userWords[i].length > 3) {
        for (var j = 0; j < respWords.length; j++) {
          if (respWords[j] === userWords[i]) { overlap++; break; }
        }
      }
    }
    var relevance = Math.min(100, Math.round((overlap / Math.max(userWords.length, 1)) * 100) + 40);

    /* Tone match: check if response keywords align with prompt tone */
    var toneScore = 60;
    var toneWordMap = {
      warm: ['help', 'happy', 'welcome', 'sorry', 'appreciate', 'glad'],
      formal: ['assist', 'please', 'provide', 'details', 'information', 'steps'],
      persuasive: ['great', 'love', 'perfect', 'value', 'wonderful', 'exciting'],
      creative: ['explore', 'ideas', 'brainstorm', 'create', 'exciting', 'imagine']
    };
    var toneWords = toneWordMap[promptAnalysis.tone] || [];
    for (var t = 0; t < toneWords.length; t++) {
      if (botResponse.toLowerCase().indexOf(toneWords[t]) !== -1) {
        toneScore += 8;
      }
    }
    toneScore = Math.min(100, toneScore);

    /* Length appropriateness: 30-200 words is ideal */
    var len = respWords.length;
    var lengthScore;
    if (len >= 20 && len <= 60) { lengthScore = 95; }
    else if (len >= 10 && len <= 80) { lengthScore = 80; }
    else if (len < 10) { lengthScore = 50; }
    else { lengthScore = 65; }

    return { relevance: relevance, tone: toneScore, length: lengthScore };
  }

  /* Render a chat message */
  function renderMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.textContent = text;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  /* Update score display */
  function updateScores(scores) {
    var el = document.getElementById('scores');
    if (!el) return;
    el.innerHTML = '<div class="score-item"><div class="score-value">' + scores.relevance + '</div><div class="score-label">Relevance</div></div>' +
      '<div class="score-item"><div class="score-value">' + scores.tone + '</div><div class="score-label">Tone Match</div></div>' +
      '<div class="score-item"><div class="score-value">' + scores.length + '</div><div class="score-label">Length</div></div>';
  }

  /* Send handler */
  function handleSend() {
    var msg = chatInput.value.trim();
    if (!msg) return;
    if (!systemPromptEl.value.trim()) {
      alert('Please enter a system prompt first (or select a preset).');
      return;
    }

    var analysis = analyzePrompt(systemPromptEl.value);
    renderMessage('user', msg);
    chatInput.value = '';

    var turnIndex = conversation.length;
    var response = generateResponse(msg, analysis, turnIndex);

    /* Simulate typing delay */
    setTimeout(function() {
      renderMessage('bot', response);
      var scores = scoreTurn(msg, response, analysis);
      updateScores(scores);
      conversation.push({ user: msg, bot: response, scores: scores });
    }, 300 + Math.random() * 400);
  }

  /* Clear chat */
  function handleClear() {
    chatArea.innerHTML = '';
    conversation = [];
    var el = document.getElementById('scores');
    if (el) el.innerHTML = '';
  }

  /* Export */
  function handleExport() {
    if (conversation.length === 0) {
      alert('No conversation to export.');
      return;
    }
    var data = {
      systemPrompt: systemPromptEl.value,
      timestamp: new Date().toISOString(),
      turns: conversation
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'chatbot-test-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /* Init */
  function init() {
    if (!sendBtn) return; /* Not on tool page */
    initPresets();
    sendBtn.addEventListener('click', handleSend);
    clearBtn.addEventListener('click', handleClear);
    exportBtn.addEventListener('click', handleExport);
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { handleSend(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
