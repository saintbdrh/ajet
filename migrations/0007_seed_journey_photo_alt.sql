UPDATE media_slots SET alt_mn = 'Уулсын дундах нуур', alt_en = 'A remote mountain lake'
  WHERE slot_key IN ('journey-01', 'journey-05') AND alt_mn = '' AND alt_en = '';
UPDATE media_slots SET alt_mn = 'Нисдэг тэрэгний бүхээг', alt_en = 'A helicopter in flight'
  WHERE slot_key = 'journey-02' AND alt_mn = '' AND alt_en = '';
UPDATE media_slots SET alt_mn = 'Нисдэг тэрэг уулын дээгүүр нисэж байна', alt_en = 'A helicopter flying above the mountains'
  WHERE slot_key IN ('journey-03', 'journey-07') AND alt_mn = '' AND alt_en = '';
UPDATE media_slots SET alt_mn = 'Уулсын оргил', alt_en = 'Mountain peaks'
  WHERE slot_key = 'journey-04' AND alt_mn = '' AND alt_en = '';
UPDATE media_slots SET alt_mn = 'Уулсын дээгүүрх нислэг', alt_en = 'A flight above mountain peaks'
  WHERE slot_key = 'journey-06' AND alt_mn = '' AND alt_en = '';
