(function(){
  var root = document.getElementById('grid');
  var exprEl = document.getElementById('expr');
  var resultEl = document.getElementById('result');

  var state = {
    expr: '',
    lastResult: 0,
    justEvaluated: false
  };

  var rows = [
    [
      {label:'AC', action:'AC', kind:'util'},
      {label:'⌫', action:'DEL', kind:'util'},
      {label:'%', action:'%', kind:'util'},
      {label:'÷', action:'/', kind:'op'}
    ],
    [
      {label:'7', action:'7', kind:'num'},
      {label:'8', action:'8', kind:'num'},
      {label:'9', action:'9', kind:'num'},
      {label:'×', action:'*', kind:'op'}
    ],
    [
      {label:'4', action:'4', kind:'num'},
      {label:'5', action:'5', kind:'num'},
      {label:'6', action:'6', kind:'num'},
      {label:'−', action:'-', kind:'op'}
    ],
    [
      {label:'1', action:'1', kind:'num'},
      {label:'2', action:'2', kind:'num'},
      {label:'3', action:'3', kind:'num'},
      {label:'+', action:'+', kind:'op'}
    ],
    [
      {label:'+/−', action:'NEG', kind:'util'},
      {label:'0', action:'0', kind:'num'},
      {label:'.', action:'.', kind:'num'},
      {label:'=', action:'=', kind:'equals'}
    ]
  ];

  var classFor = { num:'k-num', op:'k-op', util:'k-util', equals:'k-equals' };

  rows.forEach(function(row){
    row.forEach(function(btn){
      var el = document.createElement('button');
      el.textContent = btn.label;
      el.className = classFor[btn.kind];
      el.setAttribute('aria-label', btn.label);
      el.dataset.action = btn.action;
      el.addEventListener('click', function(){ press(el.dataset.action); });
      root.appendChild(el);
    });
  });

  function fmt(n){
    if(isNaN(n) || !isFinite(n)) return 'Error';
    var r = parseFloat(n.toPrecision(12));
    if(Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-9 && r !== 0)) return r.toExponential(6);
    return r.toLocaleString('en-US', {maximumFractionDigits: 10});
  }

  function prettify(s){
    return s.replace(/\*/g,'\u00d7').replace(/\//g,'\u00f7');
  }

  function tokenize(str){
    var tokens = [];
    var i = 0;
    while(i < str.length){
      var ch = str[i];
      if(/\s/.test(ch)){ i++; continue; }
      if(/[0-9.]/.test(ch)){
        var j = i;
        while(j < str.length && /[0-9.]/.test(str[j])) j++;
        tokens.push({type:'num', value: parseFloat(str.slice(i,j))});
        i = j; continue;
      }
      if('+-*/%()'.indexOf(ch) !== -1){
        tokens.push({type:'op', value: ch});
        i++; continue;
      }
      i++;
    }
    return tokens;
  }

  function makeParser(tokens){
    var pos = 0;
    function peek(){ return tokens[pos]; }
    function advance(){ return tokens[pos++]; }

    function primary(){
      var t = peek();
      if(!t) throw new Error('Unexpected end');
      if(t.type === 'num'){ advance(); return t.value; }
      if(t.type === 'op' && t.value === '('){
        advance();
        var v = expression();
        if(!peek() || peek().value !== ')') throw new Error('Expected )');
        advance();
        return v;
      }
      throw new Error('Unexpected token');
    }

    function postfix(){
      var val = primary();
      while(peek() && peek().type==='op' && peek().value==='%'){
        advance();
        val = val/100;
      }
      return val;
    }

    function unary(){
      if(peek() && peek().type==='op' && peek().value==='-'){
        advance();
        return -unary();
      }
      if(peek() && peek().type==='op' && peek().value==='+'){
        advance();
        return unary();
      }
      return postfix();
    }

    function term(){
      var val = unary();
      while(peek() && peek().type==='op' && (peek().value==='*' || peek().value==='/')){
        var op = advance().value;
        var rhs = unary();
        val = op==='*' ? val*rhs : val/rhs;
      }
      return val;
    }

    function expression(){
      var val = term();
      while(peek() && peek().type==='op' && (peek().value==='+' || peek().value==='-')){
        var op = advance().value;
        var rhs = term();
        val = op==='+' ? val+rhs : val-rhs;
      }
      return val;
    }

    return { run: expression };
  }

  function evalExpr(str){
    if(!str.trim()) return null;
    var tokens = tokenize(str);
    if(tokens.length === 0) return null;
    var parser = makeParser(tokens);
    return parser.run();
  }

  function updateDisplay(){
    exprEl.textContent = state.expr ? prettify(state.expr) : '\u00a0';
  }

  function livePreview(){
    try{
      var v = evalExpr(state.expr);
      if(v !== null && isFinite(v) && !isNaN(v)) resultEl.textContent = fmt(v);
    }catch(e){ /* keep last valid preview */ }
  }

  function fmtRaw(n){ return String(parseFloat(n.toPrecision(12))); }

  function appendAction(action){
    if(state.justEvaluated){
      if(/^[0-9.]$/.test(action)){
        state.expr = '';
      } else {
        state.expr = fmtRaw(state.lastResult);
      }
      state.justEvaluated = false;
    }
    state.expr += action;
    updateDisplay();
    livePreview();
  }

  function press(action){
    if(action === 'AC'){
      state.expr = '';
      state.justEvaluated = false;
      updateDisplay();
      resultEl.textContent = '0';
      return;
    }
    if(action === 'DEL'){
      state.expr = state.expr.slice(0, -1);
      updateDisplay();
      livePreview();
      return;
    }
    if(action === 'NEG'){
      if(state.expr.startsWith('-')){
        state.expr = state.expr.slice(1);
      } else {
        state.expr = '-' + state.expr;
      }
      updateDisplay();
      livePreview();
      return;
    }
    if(action === '='){
      try{
        var v = evalExpr(state.expr);
        if(v === null) return;
        state.lastResult = v;
        resultEl.textContent = fmt(v);
        exprEl.textContent = prettify(state.expr) + ' =';
        state.justEvaluated = true;
        resultEl.classList.remove('pop');
        void resultEl.offsetWidth;
        resultEl.classList.add('pop');
      }catch(e){
        resultEl.textContent = 'Error';
      }
      return;
    }
    appendAction(action);
  }

  document.addEventListener('keydown', function(e){
    var key = e.key;
    if(/[0-9.+\-*/()]/.test(key)){ appendAction(key); return; }
    if(key === 'Enter' || key === '='){ e.preventDefault(); press('='); return; }
    if(key === 'Backspace'){ press('DEL'); return; }
    if(key === 'Escape'){ press('AC'); return; }
    if(key === '%'){ appendAction('%'); return; }
  });

  updateDisplay();
})();(function(){
  var root = document.getElementById('grid');
  var exprEl = document.getElementById('expr');
  var resultEl = document.getElementById('result');

  var state = {
    expr: '',
    lastResult: 0,
    justEvaluated: false
  };

  var rows = [
    [
      {label:'AC', action:'AC', kind:'util'},
      {label:'⌫', action:'DEL', kind:'util'},
      {label:'%', action:'%', kind:'util'},
      {label:'÷', action:'/', kind:'op'}
    ],
    [
      {label:'7', action:'7', kind:'num'},
      {label:'8', action:'8', kind:'num'},
      {label:'9', action:'9', kind:'num'},
      {label:'×', action:'*', kind:'op'}
    ],
    [
      {label:'4', action:'4', kind:'num'},
      {label:'5', action:'5', kind:'num'},
      {label:'6', action:'6', kind:'num'},
      {label:'−', action:'-', kind:'op'}
    ],
    [
      {label:'1', action:'1', kind:'num'},
      {label:'2', action:'2', kind:'num'},
      {label:'3', action:'3', kind:'num'},
      {label:'+', action:'+', kind:'op'}
    ],
    [
      {label:'+/−', action:'NEG', kind:'util'},
      {label:'0', action:'0', kind:'num'},
      {label:'.', action:'.', kind:'num'},
      {label:'=', action:'=', kind:'equals'}
    ]
  ];

  var classFor = { num:'k-num', op:'k-op', util:'k-util', equals:'k-equals' };

  rows.forEach(function(row){
    row.forEach(function(btn){
      var el = document.createElement('button');
      el.textContent = btn.label;
      el.className = classFor[btn.kind];
      el.setAttribute('aria-label', btn.label);
      el.dataset.action = btn.action;
      el.addEventListener('click', function(){ press(el.dataset.action); });
      root.appendChild(el);
    });
  });

  function fmt(n){
    if(isNaN(n) || !isFinite(n)) return 'Error';
    var r = parseFloat(n.toPrecision(12));
    if(Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-9 && r !== 0)) return r.toExponential(6);
    return r.toLocaleString('en-US', {maximumFractionDigits: 10});
  }

  function prettify(s){
    return s.replace(/\*/g,'\u00d7').replace(/\//g,'\u00f7');
  }

  function tokenize(str){
    var tokens = [];
    var i = 0;
    while(i < str.length){
      var ch = str[i];
      if(/\s/.test(ch)){ i++; continue; }
      if(/[0-9.]/.test(ch)){
        var j = i;
        while(j < str.length && /[0-9.]/.test(str[j])) j++;
        tokens.push({type:'num', value: parseFloat(str.slice(i,j))});
        i = j; continue;
      }
      if('+-*/%()'.indexOf(ch) !== -1){
        tokens.push({type:'op', value: ch});
        i++; continue;
      }
      i++;
    }
    return tokens;
  }

  function makeParser(tokens){
    var pos = 0;
    function peek(){ return tokens[pos]; }
    function advance(){ return tokens[pos++]; }

    function primary(){
      var t = peek();
      if(!t) throw new Error('Unexpected end');
      if(t.type === 'num'){ advance(); return t.value; }
      if(t.type === 'op' && t.value === '('){
        advance();
        var v = expression();
        if(!peek() || peek().value !== ')') throw new Error('Expected )');
        advance();
        return v;
      }
      throw new Error('Unexpected token');
    }

    function postfix(){
      var val = primary();
      while(peek() && peek().type==='op' && peek().value==='%'){
        advance();
        val = val/100;
      }
      return val;
    }

    function unary(){
      if(peek() && peek().type==='op' && peek().value==='-'){
        advance();
        return -unary();
      }
      if(peek() && peek().type==='op' && peek().value==='+'){
        advance();
        return unary();
      }
      return postfix();
    }

    function term(){
      var val = unary();
      while(peek() && peek().type==='op' && (peek().value==='*' || peek().value==='/')){
        var op = advance().value;
        var rhs = unary();
        val = op==='*' ? val*rhs : val/rhs;
      }
      return val;
    }

    function expression(){
      var val = term();
      while(peek() && peek().type==='op' && (peek().value==='+' || peek().value==='-')){
        var op = advance().value;
        var rhs = term();
        val = op==='+' ? val+rhs : val-rhs;
      }
      return val;
    }

    return { run: expression };
  }

  function evalExpr(str){
    if(!str.trim()) return null;
    var tokens = tokenize(str);
    if(tokens.length === 0) return null;
    var parser = makeParser(tokens);
    return parser.run();
  }

  function updateDisplay(){
    exprEl.textContent = state.expr ? prettify(state.expr) : '\u00a0';
  }

  function livePreview(){
    try{
      var v = evalExpr(state.expr);
      if(v !== null && isFinite(v) && !isNaN(v)) resultEl.textContent = fmt(v);
    }catch(e){ /* keep last valid preview */ }
  }

  function fmtRaw(n){ return String(parseFloat(n.toPrecision(12))); }

  function appendAction(action){
    if(state.justEvaluated){
      if(/^[0-9.]$/.test(action)){
        state.expr = '';
      } else {
        state.expr = fmtRaw(state.lastResult);
      }
      state.justEvaluated = false;
    }
    state.expr += action;
    updateDisplay();
    livePreview();
  }

  function press(action){
    if(action === 'AC'){
      state.expr = '';
      state.justEvaluated = false;
      updateDisplay();
      resultEl.textContent = '0';
      return;
    }
    if(action === 'DEL'){
      state.expr = state.expr.slice(0, -1);
      updateDisplay();
      livePreview();
      return;
    }
    if(action === 'NEG'){
      if(state.expr.startsWith('-')){
        state.expr = state.expr.slice(1);
      } else {
        state.expr = '-' + state.expr;
      }
      updateDisplay();
      livePreview();
      return;
    }
    if(action === '='){
      try{
        var v = evalExpr(state.expr);
        if(v === null) return;
        state.lastResult = v;
        resultEl.textContent = fmt(v);
        exprEl.textContent = prettify(state.expr) + ' =';
        state.justEvaluated = true;
        resultEl.classList.remove('pop');
        void resultEl.offsetWidth;
        resultEl.classList.add('pop');
      }catch(e){
        resultEl.textContent = 'Error';
      }
      return;
    }
    appendAction(action);
  }

  document.addEventListener('keydown', function(e){
    var key = e.key;
    if(/[0-9.+\-*/()]/.test(key)){ appendAction(key); return; }
    if(key === 'Enter' || key === '='){ e.preventDefault(); press('='); return; }
    if(key === 'Backspace'){ press('DEL'); return; }
    if(key === 'Escape'){ press('AC'); return; }
    if(key === '%'){ appendAction('%'); return; }
  });

  updateDisplay();
})();
