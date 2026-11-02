import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('let lastRenderedTab=null;'),html.indexOf('function render(){',html.indexOf('let lastRenderedTab=null;')));
const callbacks=[];const nested={id:'ticketTable',scrollTop:245,scrollLeft:360};
const content={id:'content',scrollTop:850,scrollLeft:45,querySelectorAll(){return [nested];}};
const input={id:'pasajeSearchInput',tagName:'INPUT',selectionStart:3,selectionEnd:5,disabled:false,focus(options){this.focusOptions=options;},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}};
const nodes={content,ticketTable:nested,pasajeSearchInput:input};
const window={scrollX:20,scrollY:1900,scrollTo(x,y){this.scrollX=x;this.scrollY=y;}};
const ctx=vm.createContext({window,document:{activeElement:input,getElementById(id){return nodes[id]||null;}},requestAnimationFrame(fn){callbacks.push(fn);},state:{ui:{tab:'pasajes'}}});
vm.runInContext(source,ctx);
vm.runInContext("lastRenderedTab='pasajes';var snapshot=captureUiPosition();",ctx);
content.scrollTop=0;content.scrollLeft=0;nested.scrollTop=0;nested.scrollLeft=0;window.scrollY=0;input.selectionStart=0;
vm.runInContext('restoreUiPosition(snapshot)',ctx);
assert.equal(window.scrollY,1900);assert.equal(content.scrollTop,850);assert.equal(nested.scrollLeft,360);assert.equal(input.selectionStart,3);assert.equal(input.focusOptions.preventScroll,true);
callbacks.shift()();assert.equal(window.scrollY,1900);
// Una restauración anterior no puede sobrescribir el contexto de otra renderización.
vm.runInContext('restoreUiPosition(snapshot)',ctx);const old=callbacks.shift();window.scrollY=2200;
vm.runInContext('var current=captureUiPosition();restoreUiPosition(current)',ctx);old();assert.equal(window.scrollY,2200);
callbacks.shift()();assert.equal(window.scrollY,2200);
vm.runInContext("state.ui.tab='trabajadores';restoreUiPosition(current)",ctx);assert.equal(window.scrollY,0);assert.equal(content.scrollTop,0);assert.equal(content.scrollLeft,0);
// Un campo eliminado al cerrar el modal no se vuelve a enfocar.
delete nodes.pasajeSearchInput;vm.runInContext("state.ui.tab='pasajes';restoreUiPosition(snapshot,{immediateOnly:true})",ctx);assert.equal(window.scrollY,1900);
console.log('OK: posición vertical/horizontal, tablas, foco y selección, callbacks obsoletos, campo eliminado y navegación entre módulos.');
