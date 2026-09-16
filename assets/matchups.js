/* Matchup math only. */
(function(){'use strict';const A=window.AML,D=A.data;
function eMult(a,d){return D.strong[a].includes(d)?1.6:D.weak[a].includes(d)?.625:1}
function sMult(a,d){if(a==='distance'&&d==='fly')return 2;if(a==='strike'&&d==='tunnel')return 2;if(a==='distance'&&d==='tunnel')return .5;if(a==='strike'&&d==='fly')return .5;return 1}
function defenseElementScore(attackerElement,defenderElements){return defenderElements.reduce((v,d)=>v*eMult(attackerElement,d),1)}
function bestOffenseScore(attackerElements,defenderElements){return Math.max(...attackerElements.map(a=>defenseElementScore(a,defenderElements)))}
function incomingThreatScore(defenderElements,attackerElement){return defenseElementScore(attackerElement,defenderElements)}
function scoreLabel(v){if(v>2.3)return A.t('doubleWeak');if(v>1.001)return A.t('superEffective');if(v<.45)return A.t('doubleResist');if(v<.999)return A.t('notEffective');return A.t('neutral')}
const scoreKind=v=>v>1.001?'good':v<.999?'bad':'warn';window.AML_MATCH={eMult,sMult,defenseElementScore,bestOffenseScore,incomingThreatScore,scoreLabel,scoreKind};})();
