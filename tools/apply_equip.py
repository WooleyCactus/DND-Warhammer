"""Insert tools/equip_block.js into index.html and wire its hooks (quality, equipment slots, bonded weapons).
Safe to re-run: the block is replaced; each hook is only applied if its old text is still there."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'index.html')
s = open(P).read()
blk = open(os.path.join(ROOT, 'tools', 'equip_block.js')).read().rstrip('\n') + '\n'
s = re.sub(r'/\* EQUIP-START.*?/\* EQUIP-END \*/\n', '', s, flags=re.S)
s = s.replace('/* WEAR-END */\n', '/* WEAR-END */\n' + blk, 1)

def rep(old, new, must=True):
    global s
    if new in s: return
    if old in s: s = s.replace(old, new, 1)
    elif must: raise SystemExit('hook not found: ' + old[:80])

CSS = """/* EQUIP-CSS */
.eq-doll{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:8px;max-width:560px;margin:0 auto 10px}
.eq-col{display:flex;flex-direction:column;gap:6px}.eq-col.mid{padding-top:14px}
.eq-s{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:58px;padding:6px 4px;border:1px solid var(--line,#3a3328);border-radius:8px;background:rgba(255,255,255,.03);color:inherit;font:inherit;cursor:pointer;box-shadow:inset 0 0 0 1px var(--rc)}
.eq-col.mid .eq-s{min-height:66px}.eq-s.full{background:rgba(255,255,255,.07)}.eq-s.sel{outline:2px solid var(--gold,#d8b25a)}.eq-s.pa .eq-i{color:#e8c46a}
.eq-i{font-size:17px;opacity:.75;line-height:1}.eq-l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.eq-n{font-size:11.5px;line-height:1.15;text-align:center;color:var(--rc);font-weight:600;word-break:break-word}
.eq-pick{border:1px solid var(--line,#3a3328);border-radius:8px;padding:10px;margin:0 0 10px;background:rgba(0,0,0,.2)}
.eq-list{display:flex;flex-direction:column;gap:6px;margin:8px 0}.eq-opt{text-align:left;padding:8px;border:1px solid var(--line,#3a3328);border-left:3px solid var(--rc);border-radius:6px;background:none;color:inherit;font:inherit;cursor:pointer}
.eq-opt small{display:block;color:var(--muted);font-size:12px;margin-top:2px}
.eq-sum{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;margin-bottom:6px}.eq-sum .bad,.eq-fx .bad{color:#e07a5f}.eq-sum .good{color:#8fc7a0}
.eq-fx{padding:6px 0;border-top:1px solid var(--line,#3a3328)}.eq-fx small{display:block;color:var(--muted)}.eq-fx.dead{opacity:.6}
.bd-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 10px;font-size:12.5px}.bd-k{font-weight:600;margin-right:4px}
.bd-pip{padding:2px 8px;border:1px dashed var(--line,#3a3328);border-radius:999px;color:var(--muted)}.bd-pip.on{border-style:solid;color:inherit;background:rgba(216,178,90,.12)}
.bd-bar.over .bd-k,.bd-warn{color:#e07a5f}
.bd-ask{border:1px solid #e07a5f;border-radius:8px;padding:10px;margin:0 0 10px;font-size:13.5px}
.bd-stow{margin-top:10px}.bd-offs{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.bd-off{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;border-left:3px solid var(--rc);background:rgba(255,255,255,.03);border-radius:6px}.bd-off small{display:block;color:var(--muted)}
/* EQUIP-CSS-END */
"""
s = re.sub(r'/\* EQUIP-CSS \*/.*?/\* EQUIP-CSS-END \*/\n', '', s, flags=re.S)
s = s.replace('</style>', CSS + '</style>', 1)

# rarity labels: rarity = how magical; quality (Broken..Mastercrafted) is separate
rep("const RARITY={common:['Standard issue','#b4ae9f'],uncommon:['Mastercrafted','#6fcf8e'],rare:['Archeotech','#5aa9e6'],veryrare:['Relic','#b07cf0'],legendary:['Artefact','#f0a33a']};",
    "const RARITY={common:['Common','#b4ae9f'],uncommon:['Uncommon','#6fcf8e'],rare:['Rare','#5aa9e6'],veryrare:['Relic','#b07cf0'],legendary:['Artefact','#f0a33a']};")
# weapon name + rarity: quality prefix, +N suffix, rarity = higher of catalogue rarity and bonus tier
rep(" w.rarity=wx.rarity||RAR_BY_BONUS[Math.min(3,bonus)]||'common';\n w.to=wx.name||(TIER_NAME[Math.min(3,bonus)]+String(w.to).replace(/^(Mastercrafted|Archeotech|Relic) /,''));",
    " w.q=qOf(wx);const wk=wKeyOf(w);w.rarity=wx.rarity||rarMax((wk&&WEAPONS[wk]&&WEAPONS[wk].rarity)||'common',RAR_BY_BONUS[Math.min(3,bonus)]||'common');\n w.to=wx.name||(qPrefix(wx)+String(w.to).replace(/^(Mastercrafted|Archeotech|Relic) /,'').replace(/\\s*\\+\\d$/,'')+(bonus?' +'+bonus:''));")
# attachments: bonuses capped (+1 hit, +2 damage), Broken quality −2 to hit
rep("function attachParts(w,kind){const out=[];(w.att||[]).forEach(k=>{const A=attDef(k,w.wx);if(!A)return;const v=kind==='atk'?A.atk:A.dmg;if(v)out.push([A.n,v]);});return out;}",
    "function attachParts(w,kind){const out=[];let left=kind==='atk'?ATT_ATK_CAP:ATT_DMG_CAP;(w.att||[]).forEach(k=>{const A=attDef(k,w.wx);if(!A)return;let v=kind==='atk'?A.atk:A.dmg;if(v>0){v=Math.min(v,left);left-=v;}if(v)out.push([A.n,v]);});if(kind==='atk'&&qOf(w.wx||w)==='broken')out.push(['Broken',-2]);return out;}")
# attachment slots come from quality
rep("const gm=gmNow();const inv=invOf(ch);const cap=RAR_CAP[w.rarity]||1;", "const gm=gmNow();const inv=invOf(ch);const cap=wSlots(w);")
rep("!(w.att||[]).includes(it.att)&&attachOK(it.att,w,ATTACH[it.att]||it.hbDef));", "!(w.att||[]).includes(it.att)&&attachOK(it.att,w,ATTACH[it.att]||it.hbDef)&&!attTypeTaken(w,it.att,ATTACH[it.att]||it.hbDef));")
rep("Installed (${used}/${cap} slots for ${esc(RARITY[w.rarity][0])})", "Installed (${used}/${cap} slots: ${esc(QUAL[qOf(w)][0])} quality)")
rep("All slots used. Higher-rarity weapons hold more attachments.", "All slots used. Better-made weapons hold more attachments (Broken 0 to Mastercrafted 5).")
rep("if((w.att||[]).length>=(RAR_CAP[w.rarity]||1)){toastMsg('No free attachment slots.');return true;}",
    "if((w.att||[]).length>=wSlots(w)){toastMsg('No free attachment slots.');return true;}if(attTypeTaken(w,it.att,ATTACH[it.att]||it.hbDef)){toastMsg('It already has an attachment of that type.');return true;}")
rep("opt(k,`${v[0]} (${RAR_CAP[k]} slot${RAR_CAP[k]>1?'s':''})`,w.wx&&w.wx.rarity||'')).join('')}",
    "opt(k,v[0],w.wx&&w.wx.rarity||'')).join('')}")
rep("[0,1,2,3].map(b=>opt(b,b?`+${b} (${TIER_NAME[b].trim()})`:'None',w.bonus)).join('')}</select></label></div>`:''}",
    "[0,1,2,3].map(b=>opt(b,b?`+${b}`:'None',w.bonus)).join('')}</select></label><label class=\"f\"><span>Quality</span><select data-lo=\"q\" data-i=\"${i}\">${Object.entries(QUAL).map(([k,v])=>opt(k,`${v[0]} (${v[1]} slot${v[1]===1?'':'s'})`,qOf(w))).join('')}</select></label></div>`:''}")
rep("Only the GM can change rarity or enhancement.", "Only the GM can change rarity, bonus or quality.")
rep("if(t.dataset.lo==='rarity')wx.rarity=t.value||undefined;", "if(t.dataset.lo==='rarity')wx.rarity=t.value||undefined;if(t.dataset.lo==='q'){if(t.value==='standard')delete wx.q;else wx.q=t.value;}")
rep("RAR_CAP[w.rarity]||1} slots</span></div>", "wSlots(w)} slots</span></div>")
# AC: chest base (quality penalty) + capped pieces + shield
rep(""" if(!body&&!sh){if(s.acBase!=null){s.ac=s.acBase;delete s.acBase;}return;}
 if(s.acBase==null)s.acBase=s.ac||10+dex;
 if(body){const [b,cap]=armourSpec(body);const def=/\\"defense\\"|Bulwark Doctrine/.test(JSON.stringify(s.opts||{})+(s.features||''))?1:0;
  s.ac=b+Math.min(dex,cap)+((sh||s.shield)?2:0)+def;}
 else s.ac=s.acBase+(s.shield?0:2);}""",
""" const pcs=typeof pieceAC==='function'?pieceAC(ch).used:0;
 if(!body&&!sh&&!pcs){if(s.acBase!=null){s.ac=s.acBase;delete s.acBase;}return;}
 if(s.acBase==null)s.acBase=s.ac||10+dex;
 if(body){const [b,cap]=armourSpec(body);const def=/\\"defense\\"|Bulwark Doctrine/.test(JSON.stringify(s.opts||{})+(s.features||''))?1:0;
  s.ac=Math.min(ARMOUR_CEIL,b+Math.min(dex,cap)+chestQPen(body)+pcs)+((sh||s.shield)?2:0)+def;}
 else s.ac=s.acBase+(sh&&!s.shield?2:0)+pcs;}""")
rep("function wearable(it){return !!armourSpec(it)||isShield(it);}", "function wearable(it){return !!armourSpec(it)||isShield(it)||(typeof itemSlot==='function'&&!!itemSlot(it)&&it.cat!=='curio'&&it.cat!=='relic')||!!it.slot;}")
# loadout: bonded weapons only, bond bar, stowed list
rep(" const cards=wcs.map((wc,i)=>{const w=wc.w;", " const bs=bondState(ch,d);\n const cards=wcs.map((wc,i)=>{if(!bs.on[i])return '';const w=wc.w;")
rep("""${ex?'':`<button class="btn sm ghost" data-act="loedit" dat""", """${ex?'':`<button class="btn sm ghost" data-act="bdoff" data-i="${i}" title="Unbond (stow) this weapon">Unbond</button>`}${ex?'':`<button class="btn sm ghost" data-act="loedit" dat""")
rep("""<small>tap Hit or Damage for how to roll</small></h2><div class="lo-grid">${cards}</div>""",
    """<small>tap Hit or Damage for how to roll</small></h2>${bondBar(ch,d,bs)}${bondAskPanel(ch,d,bs)}<div class="lo-grid">${cards}</div>${bondStowed(ch,d,bs)}""")
# sheet: equipment section after the kit
rep(" ${vLoadout(ch,d)}${vKit(ch)}\n", " ${vLoadout(ch,d)}${vKit(ch)}${vEquip(ch,d)}\n")
# clicks + inputs
rep("  case 'loedit':case 'lopend':case 'lopendx':case 'loinst':case 'lorem':loClick(a,b,ch);break;",
    "  case 'loedit':case 'lopend':case 'lopendx':case 'loinst':case 'lorem':loClick(a,b,ch);break;\n  case 'bdon':case 'bdoff':case 'bdswap':case 'bdcancel':bondClick(a,b,ch);break;\n  case 'eqopen':case 'eqput':case 'eqoff':eqClick(a,b,ch);break;")
rep(" if(S.view==='sheet'&&loInput(t))return;", " if(S.view==='sheet'&&loInput(t))return;\n if(S.view==='sheet'&&eqInput(t))return;")
rep("case 'gcat':case 'ginfo':case 'gwear':{const inv=invOf(ch);const it=inv.find(x=>x.id===b.dataset.id);if(!it)break;const on=!it.worn;",
    "case 'gcat':case 'ginfo':case 'gwear':{const inv=invOf(ch);const it=inv.find(x=>x.id===b.dataset.id);if(!it)break;if(itemSlot(it)){const on=eqToggle(ch,it);recalcAC(ch);persist(ch,true);render();toastMsg(on?`${it.name} on (${EQ_LABEL[wornSlot(it)]||'worn'}). AC is now ${ch.src.ac}.`:`${it.name} off. AC is now ${ch.src.ac}.`);break;}const on=!it.worn;")
# carry slot fields when items move
rep("hbDef:c.hbDef,hb:!!c.hb,icon:c.icon,armour:c.armour});\n return `${c.name} added.`;", "hbDef:c.hbDef,hb:!!c.hb,icon:c.icon,armour:c.armour,slot:c.slot,acb:c.acb,pa:c.pa,q:c.q});\n return `${c.name} added.`;")
rep("icon:it.icon,hb:!!it.hb,att:it.att,hbDef:it.hbDef,armour:it.armour};", "icon:it.icon,hb:!!it.hb,att:it.att,hbDef:it.hbDef,armour:it.armour,slot:it.slot,acb:it.acb,pa:it.pa,q:it.q};if(it.q)item.id+=':'+it.q;")
# gear rows show quality
rep("""aria-expanded="${open}">${esc(it.name)}""", """aria-expanded="${open}">${esc((typeof qPrefix==='function'?qPrefix(it):'')+it.name)}""")
open(P, 'w').write(s)
print('equip block + hooks applied to index.html')
