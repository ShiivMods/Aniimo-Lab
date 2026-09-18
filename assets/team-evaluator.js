/* Shared four-member team evaluation helpers. */
(function() {
  'use strict';

  const A = window.AML;
  const D = A.data;
  const M = window.AML_MATCH;

  function evaluateTeam(team, useRoles = true) {
    const coverage = D.elementOrder.filter(defender => {
      return team.some(a => M.bestOffenseScore(a.elements, [defender]) > 1.001);
    });

    const sharedWeaknesses = D.elementOrder.map(attacker => {
      const weakMembers = team.filter(a => M.defenseElementScore(attacker, a.elements) > 1.001);
      return { element: attacker, count: weakMembers.length, members: weakMembers.map(a => a.key) };
    }).filter(x => x.count >= 2).sort((a, b) => b.count - a.count);

    const resistances = D.elementOrder.map(attacker => {
      const count = team.filter(a => M.defenseElementScore(attacker, a.elements) < .999).length;
      return { element: attacker, count };
    }).filter(x => x.count >= 2).sort((a, b) => b.count - a.count);

    const roles = team.map(a => a.role);
    const hasDps = roles.includes('DPS');
    const hasBreak = roles.includes('BREAK');
    const hasSupport = roles.some(r => ['SUPPORT', 'HEAL', 'REGEN'].includes(r));
    const roleDiversity = new Set(roles).size;
    const elementDiversity = new Set(team.flatMap(a => a.elements)).size;

    let score = coverage.length / D.elementOrder.length * 55;
    score += Math.min(elementDiversity, 6) / 6 * 15;
    score += Math.min(resistances.reduce((n, x) => n + x.count, 0), 8) / 8 * 8;

    if (useRoles) {
      score += hasDps ? 7 : 0;
      score += hasBreak ? 7 : 0;
      score += hasSupport ? 4 : 0;
      score += Math.min(roleDiversity, 4);
    } else {
      score += 22;
    }

    const weaknessPenalty = sharedWeaknesses.reduce((n, x) => n + Math.max(0, x.count - 1) * 2.5, 0);
    score -= Math.min(weaknessPenalty, 18);
    score = Math.max(0, Math.min(100, Math.round(score)));

    const grade = score >= 82 ? 'excellent' : score >= 68 ? 'solid' : score >= 52 ? 'workable' : 'fragile';

    return {
      score,
      grade,
      coverage,
      sharedWeaknesses,
      resistances,
      roles: { hasDps, hasBreak, hasSupport, roleDiversity },
      elementDiversity
    };
  }

  function replacementSuggestions(team, useRoles = true, limit = 4) {
    const base = evaluateTeam(team, useRoles);
    const used = new Set(team.map(a => a.key));
    const suggestions = [];

    team.forEach((out, index) => {
      A.visibleAniimos.forEach(candidate => {
        if (used.has(candidate.key)) return;
        const next = [...team];
        next[index] = candidate;
        const result = evaluateTeam(next, useRoles);
        const gain = result.score - base.score;
        if (gain < 4) return;
        suggestions.push({ out, in: candidate, gain, result });
      });
    });

    suggestions.sort((a, b) => b.gain - a.gain || b.result.coverage.length - a.result.coverage.length);
    const uniqueIn = new Set();
    return suggestions.filter(s => {
      if (uniqueIn.has(s.in.key)) return false;
      uniqueIn.add(s.in.key);
      return true;
    }).slice(0, limit);
  }

  window.AML_TEAM = { evaluateTeam, replacementSuggestions };
})();
