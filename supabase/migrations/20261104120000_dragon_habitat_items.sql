-- Add free artwork without replacing existing item IDs, ownership or saved layouts.
insert into public.dragon_items (id, name, kind, art, free, sort_order) values
 ('lava-open-foreground', '용암 계곡', 'background', 'lava-open-foreground', true, 30),
 ('lava-stone-platform', '넓은 바위 터', 'background', 'lava-stone-platform', true, 31),
 ('lava-central-volcano', '중앙 화산', 'background', 'lava-central-volcano', true, 32),
 ('lava-waterfall', '용암 폭포', 'background', 'lava-waterfall', true, 33),
 ('ancient-dragon-relic', '고대 드래곤 석비', 'prop', 'ancient-dragon-relic', true, 34),
 ('lava-crystal', '용암 수정', 'prop', 'lava-crystal', true, 35);
