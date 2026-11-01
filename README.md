# Rogue Trader Manifest

Converts D&D 5e characters into Warhammer 40k Rogue Trader characters for a homebrew campaign.

- Create a new character step by step (2024 rules, D&D Beyond order)
- Import a D&D Beyond PDF export, or an .xlsx / .xls / .csv character sheet
- Review and fix what was read, then convert: classes → careers, species → origins, skills, weapons, armour and spells
- Play from the sheet: HP, spell slots, ammo, Corruption, Insanity, Perils of the Warp, dice

- Battle map (`map.html`): 5-ft square grid shared live with the party. The GM generates maps (voidship deck, hive underworks, Egarian labyrinth, open ground), paints terrain, adds enemies and runs initiative; players move their own tokens.

Single-file app (`index.html`). Without a party, characters save in the browser. With a party code, they save to Supabase and sync live across the table (schema in `supabase/schema.sql`; battle map in `supabase/maps.sql`).

Live site: https://wooleycactus.github.io/DND-Warhammer/
Player guide: https://wooleycactus.github.io/DND-Warhammer/guide.html
Battle map: https://wooleycactus.github.io/DND-Warhammer/map.html
