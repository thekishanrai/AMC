-- 0008: Persistent slugs. URLs are stored in the database, never recomputed from names.
-- The backfill uses the EXACT slugs the live site computed on 2026-09-24 (buildSlugMap over
-- published spots), verified 254/254 against https://antimondayclub.com/sitemap.xml.

alter table spots add column if not exists slug text;

update spots s set slug = v.slug
from (values
  ('016eb45e-c56e-4872-a912-4024c0e3c0b8'::uuid, 'bhushangad-fort'),
  ('03c9cd2f-1084-4991-950a-3e6c290750d0'::uuid, 'manikgad'),
  ('05dd85a6-8720-4d3d-a59d-b93819877f58'::uuid, 'balwantgad-trek'),
  ('05f4c23c-4e5f-469f-a1e7-506349ae39f3'::uuid, 'marunji-tekdi'),
  ('06530c5d-cef3-41e0-bc31-809c8e147980'::uuid, 'gaolan-dongar'),
  ('0676de8d-a704-478b-946e-ba58e0eff65b'::uuid, 'antur-fort'),
  ('0790d59f-b53c-417f-894f-0f77776bc241'::uuid, 'naldurg-fort'),
  ('086755bd-5c85-4189-9494-b83419c5a054'::uuid, 'fort-aguada'),
  ('0b207b64-75b2-4824-9fa9-0b57400f5e14'::uuid, 'connaught-peak-point'),
  ('0c0b9527-85b7-4d80-8030-eac9f761502e'::uuid, 'ahupe-ghat-trek'),
  ('0c3c8258-2a23-48bf-9076-2d4763589912'::uuid, 'kalavantin-durg'),
  ('0c7ce204-7e8a-44ab-a11f-b0eea953575c'::uuid, 'shirota-lake-camping'),
  ('0def4e5b-d597-40c4-ac9c-4f1f442b93df'::uuid, 'siddhagad-fort-murbad'),
  ('0e60dde0-f21e-4299-9218-38921cc08a0f'::uuid, 'sarasghar'),
  ('0f4005c4-49aa-4342-9b0e-a145222b7841'::uuid, 'sumargad-fort'),
  ('10035f75-3f7d-48cc-8504-24ef8b48c29c'::uuid, 'trek-satana-taluka-nashik-district'),
  ('127f7271-0357-4244-8b17-75cbba6fc28d'::uuid, 'panchgani-camping'),
  ('1382bd6c-4a46-415e-9a17-6bd30e1f6a7d'::uuid, 'tandulwadi'),
  ('13ffe54e-1917-4194-9da7-882ecc3c4475'::uuid, 'mangad-fort'),
  ('143735d5-19f4-44d2-bc1f-e9b17aa21ba4'::uuid, 'pargad-fort'),
  ('159e0b22-0f00-4765-87bf-870d4d41ac30'::uuid, 'ramdurg-fort-rampur'),
  ('15dbf280-0607-4415-a164-9b8fc3d33b82'::uuid, 'dundha-fort'),
  ('16342632-042a-45fa-935f-01fbb809fd2a'::uuid, 'manohar-mansantoshgad-forts'),
  ('169cf280-53e9-48e8-b5c7-148c915a44e8'::uuid, 'torna'),
  ('16b25cf1-f9dd-4c7f-9a93-b4ed9e88f1f1'::uuid, 'raigad'),
  ('17b1500f-1dd9-4c15-a459-587cc3d36c60'::uuid, 'irshalgad'),
  ('19f8c740-ff9c-4484-8eff-e75fb6ac1f34'::uuid, 'mulshi-lake-camping'),
  ('1aaa7515-5709-40ae-8d6e-8cf059af3d37'::uuid, 'chaulher-fort'),
  ('1dcd5519-0770-4c88-a2b2-be1d946d99ed'::uuid, 'arnala-fort-trek'),
  ('20786e20-296a-42e9-8af5-5b7995e67b19'::uuid, 'ghangad-fort-trek'),
  ('20de7ecf-07f5-4439-ba33-bb71940f9e36'::uuid, 'vajragad-vasai-fort'),
  ('22e787e1-b1a6-4409-b6d4-c1583202a987'::uuid, 'salota-fort'),
  ('27244df7-12ca-49f8-a6cb-12ff9e72b6e6'::uuid, 'kelwa-beach-camping'),
  ('27baa5fa-9295-40ac-bb71-7d140c5036fb'::uuid, 'kondhari-waterfall'),
  ('29960c76-a9a3-4878-a438-7951f1f3e9c7'::uuid, 'nhavigad-rantangad-fort'),
  ('2e65a482-ce99-438b-bca2-d70ad1b6eed6'::uuid, 'manikdurg-mandki-fort'),
  ('2eff7aee-8736-46fc-b3d3-e42658185883'::uuid, 'ajinkyatara-fort'),
  ('2f07ff0e-f996-4fcc-a272-eab4d5e19fb2'::uuid, 'bahadurgad-pedgaon-fort'),
  ('3057818f-c8fa-4031-bf2c-7dcf73009f8d'::uuid, 'kelve-fort'),
  ('30f3ac46-62fb-438e-9eeb-eb68f22f35e3'::uuid, 'varugad-fort'),
  ('31160239-7512-4fc6-bbda-297c7551ce2c'::uuid, 'panshet-lakeside-camping'),
  ('313bbd8c-9ac0-417c-b520-2538a12f41f4'::uuid, 'bhigwan-bird-camping'),
  ('31ce14e8-3c20-436e-b5d6-e05a18971a6c'::uuid, 'mohandar-shidaka-fort'),
  ('3352e860-8ca4-46ea-88a8-b3f79265d887'::uuid, 'bhimashankar'),
  ('341aea53-c95b-4544-b7b0-eb06426b95a7'::uuid, 'songir-fort-dhule'),
  ('36489935-4ba3-46e7-ae82-5bcd16fc1737'::uuid, 'hadsar-fort'),
  ('38117edb-c32e-4b2b-a259-798a54b15e1c'::uuid, 'karnala-camping'),
  ('383b22ce-84bb-4217-9336-401f0eb742e6'::uuid, 'naneghat'),
  ('39070258-672f-44d3-ac2f-5da7c029716f'::uuid, 'sinhagad-fort'),
  ('39a64600-4b67-4623-8180-392f36232be8'::uuid, 'bharatgad-fort'),
  ('39d91db1-5a4e-4514-b4d7-e902f11cb0cb'::uuid, 'ramshej'),
  ('3aee4824-3b3d-48a5-bdd7-f79f67773218'::uuid, 'nivati-fort'),
  ('3c26292f-4643-4c7b-b03f-6f6c51c0d987'::uuid, 'jaigad-fort'),
  ('3ff123ac-915f-4123-8c67-6d685bc4d41a'::uuid, 'mahimangad-fort'),
  ('404345b8-f1ea-44e1-9fee-a6da69c7b958'::uuid, 'markandeya-fort-trek'),
  ('405a3360-ead1-494e-bd55-83a66d1daf40'::uuid, 'karjat-riverside-camping'),
  ('40f6da1a-d916-49d5-a82b-8eacc48fc333'::uuid, 'hargad-fort'),
  ('410b2959-bbb1-48dc-b857-7bb4e598eda7'::uuid, 'narnala-fort'),
  ('41c9bc6f-3559-47bb-876d-8fe0ae54e9bd'::uuid, 'rawlya-fort'),
  ('44574d3b-35ea-44da-8645-7149cbce52da'::uuid, 'akluj-fort'),
  ('476cf80d-aceb-42fc-b425-bd949aa4d984'::uuid, 'korighad'),
  ('47853232-2a50-4ae8-a88f-f58bf047765c'::uuid, 'chandan-vandan-trek'),
  ('485e7e51-b2ea-4e7b-9849-bc926ef49667'::uuid, 'prachitgad'),
  ('4d154f9b-e1d8-48fb-abca-2f46583b6abd'::uuid, 'bhopatgarh'),
  ('4dd977dc-9950-4bfa-81a5-2c45cc20170c'::uuid, 'udgir-fort'),
  ('4e10b1e5-866c-4151-9998-6307830bd23c'::uuid, 'saat-pir-baba'),
  ('4f26742d-e1b2-4e78-b007-b2f0647cd7ff'::uuid, 'gambhirgad-peak'),
  ('500813c7-7395-4a71-8dfb-88a43f21bc92'::uuid, 'vilasgad-mallikarjun-fort'),
  ('50229058-172b-427e-8a76-bc3a26feafee'::uuid, 'kanchan-fort'),
  ('516a6420-e0b4-496d-94a0-242a96f71087'::uuid, 'kamalgad-trek'),
  ('5348d879-97e0-4c17-9b10-5dee60c8c0d1'::uuid, 'shirgaon-fort'),
  ('53808d72-62ab-47d2-b6dd-5c2390a82772'::uuid, 'bitangad-fort'),
  ('53a18c0b-3c6b-48f0-8d9d-8227f5a832d7'::uuid, 'ghosalgad'),
  ('54581d90-64ab-47b7-936e-ef51f4b2aeff'::uuid, 'manikpunj-fort'),
  ('54650535-37b9-4ffd-a1d1-28c67f127df6'::uuid, 'kolad-riverside-camping'),
  ('5745d19b-6a94-4537-8eb9-52532c23cf98'::uuid, 'kashid-beach-camping'),
  ('577a5a9c-074a-48ee-9aa6-c3301f2254db'::uuid, 'manjarsumbha-fort'),
  ('578dcffc-a4dc-406a-9222-d9a6b04e0d2a'::uuid, 'kalsubai-peak'),
  ('58571abb-06dc-4b48-95d1-b8753e3d2a63'::uuid, 'rajmachi-trek'),
  ('588021c7-755d-47ae-a068-500befe04d13'::uuid, 'paranda-fort'),
  ('590b0d25-d92c-4ea5-bfb0-fe7bb541e5ec'::uuid, 'mahipalgad-fort'),
  ('5d770a02-e43b-420e-88e5-04bc695dd3a5'::uuid, 'bhoot-bangla-trek'),
  ('5e442d62-e30f-4d04-aba7-b795cf7471c7'::uuid, 'shrivardhan'),
  ('5f486aa2-7618-4762-99aa-9d227223aec6'::uuid, 'santoshgad-fort'),
  ('601ba74b-a35b-441f-a53b-f2b06b7924d8'::uuid, 'sitabuldi-fort'),
  ('604e0159-a80f-4348-a54a-be55be35b4d2'::uuid, 'sandhan-valley-camping'),
  ('6069dd4a-4389-4c6c-b63f-c7dc0fc27f0d'::uuid, 'karnala-fort-trek'),
  ('64bf145a-d02b-4bec-b341-deb0a22ff821'::uuid, 'riwa-fort-kala-qilla'),
  ('652b1a44-9c2d-4b3f-ac38-d5c1117e67a6'::uuid, 'suvarnadurg-fort'),
  ('656f5003-7ed6-41a7-a359-ac1b6555b152'::uuid, 'pabargad-fort'),
  ('66289ec7-0cdf-4579-b0f2-d37f980ea5fe'::uuid, 'purushwadi-fireflies-camping'),
  ('6632ce2a-99eb-4220-a4ad-79136a754d5f'::uuid, 'bhandardara-camping'),
  ('671c60d7-8848-4de4-9440-1a52ec798a92'::uuid, 'salher'),
  ('68085690-c154-4690-99f8-ddbe7d548aa3'::uuid, 'duke-s-nose'),
  ('681b6252-6e98-4bd7-8a66-d8a87c4d2301'::uuid, 'malhargad'),
  ('689ecd3c-23a9-43b8-adef-c136b9109416'::uuid, 'nanded-fort-nandgiri'),
  ('69d4324c-b912-4795-b349-9e217da6f7bc'::uuid, 'bhojgiri-peak'),
  ('6a4c9489-1cc6-4c5e-820e-7f7b634ed2bb'::uuid, 'sadashivgad-fort-karad'),
  ('6e449b7f-867a-4b8b-b833-e4cda3cf66be'::uuid, 'jivdhan'),
  ('6e958fa9-dc5f-484b-b8bf-1dbc9599bb03'::uuid, 'jadhavwadi-peak'),
  ('6f206e19-0fee-4f30-95d4-6373f2577d52'::uuid, 'bankot-fort'),
  ('6ffdf158-81c8-45c4-b52f-4d07a004c044'::uuid, 'talagad'),
  ('7068c91c-0a35-4ebf-83a5-eb9f480c9831'::uuid, 'alibaug-beach-camping'),
  ('71100b9c-deea-40ef-b489-24705cb78643'::uuid, 'arthur-seat-chandragad-trek'),
  ('71cde3a0-65e1-4f73-a65c-ef93889e6183'::uuid, 'shivgad-fort-dajipur'),
  ('727f7c4c-fadc-4ca0-8b2e-807910a6de5c'::uuid, 'ratangad-trek'),
  ('740cd192-80f0-464f-a071-1322ceacf10d'::uuid, 'gunya'),
  ('756116b6-0b58-4436-9403-8adcd75aa223'::uuid, 'amba-dongar'),
  ('758d26f7-5a8e-426f-82bb-da33b01ab2a5'::uuid, 'parvatgad-fort'),
  ('778c25ea-64c2-4246-900e-5e62e518a476'::uuid, 'underi-fort'),
  ('7808acb1-120e-47c5-ac3f-da21f9521e6e'::uuid, 'lingana-raigad-trek'),
  ('7a505528-9a1b-4aad-92c4-30ab24d47d8b'::uuid, 'korlai'),
  ('7b59d2e1-2ca8-4747-978d-0a5a892c0edb'::uuid, 'karnala-bird-sanctuary'),
  ('7b7deb79-f0dd-4091-a8fa-deedff6abfe2'::uuid, 'bhudargad-fort'),
  ('7b95b607-c5b4-4975-8b81-3185b0eec82a'::uuid, 'nagardhan-fort'),
  ('7c6928e6-cfec-4e45-8fc5-a380e0a98746'::uuid, 'siddhgad-bhimashankar-trek'),
  ('7d1ee6e4-6422-4bf6-b523-c87ec0dc0f72'::uuid, 'khanderi-fort'),
  ('7dd4c9d2-96ce-40c2-9244-ba24731239f0'::uuid, 'randha-falls'),
  ('7f47cb13-505d-459e-9f88-dc022140ecbe'::uuid, 'kamandurg-trek'),
  ('80c1f418-b1bf-43ba-904a-805749ec7168'::uuid, 'dehergad'),
  ('8168ae3a-a846-4b7d-824c-2123848c3a46'::uuid, 'dhodap-fort-trek'),
  ('82530bd5-de08-47fa-bab2-620aa4d8a91c'::uuid, 'madhu-makrandgad-trek'),
  ('82d3e728-9d4c-4206-b959-6bfd3dfe8002'::uuid, 'achala-fort'),
  ('83e0067a-ad4d-4d76-934a-44c0d5cb7935'::uuid, 'harishchandragad-camping'),
  ('845744e1-c990-44c2-96c9-e75746a97140'::uuid, 'ramgad-fort-sindhudurg'),
  ('857c6bef-94d9-4d30-908a-8f20a2fa76b5'::uuid, 'vijaydurg-fort'),
  ('85ad548b-8260-44ac-9287-2e05947d70d7'::uuid, 'vasota-jungle-camping'),
  ('879a208f-1bfe-4f39-b126-97e4f49be96a'::uuid, 'mahuli'),
  ('88242f7f-d844-4ba7-9624-7208fb327840'::uuid, 'sindola-fort-trek'),
  ('8a014644-cde0-4d72-95f7-19c84686edde'::uuid, 'indrai-fort'),
  ('8a4ee5cd-25ef-498f-9f37-fd022692178d'::uuid, 'belgaum-fort'),
  ('8a806887-d4b4-4374-942e-2bbbbb31ef63'::uuid, 'sudhagad'),
  ('8e6245f6-d87a-4585-a893-f4dc17850a52'::uuid, 'malegaon-fort-mahuligram'),
  ('8ecf9dc3-6c25-400c-8656-a95fee78f4b0'::uuid, 'siddhagad-fort-malvan'),
  ('94591d85-ac01-484a-8c78-843da7844af9'::uuid, 'vasai-fort'),
  ('94b38781-c5d3-42c4-8ae0-da4fc5d05cf5'::uuid, 'prabalgad'),
  ('94d48aed-ddd1-4f36-86dc-f7e4b61ff156'::uuid, 'takmak-fort-trek'),
  ('94f46bbb-5cde-41fc-9fc3-5e7cbdbeca31'::uuid, 'wai-dhom-lake-camping'),
  ('95567f52-2e1d-4900-a579-35af6ba2c1c6'::uuid, 'kamshet-camping'),
  ('9585012f-e70d-4c5a-bbae-6f3c937e2863'::uuid, 'sagargad-trek'),
  ('96539293-0e4a-42a2-985c-7e2cc3042928'::uuid, 'pratapgad-bhorpyacha-dogar'),
  ('980ef254-0893-4abb-ab50-b6bcbac77366'::uuid, 'gorakhgad-trek'),
  ('994ea82e-f249-48bb-8200-6f1375a79b55'::uuid, 'rohida-vichitragad-trek'),
  ('9958996c-5845-4062-b68e-f0383981af8a'::uuid, 'jawlya-fort'),
  ('995da521-ce8d-4c6c-9db6-956404bbc7b1'::uuid, 'sindhudurg-fort'),
  ('9bca64a1-4d40-4aa8-a871-01171fc02891'::uuid, 'pawangad-fort'),
  ('9d047965-b870-4c18-b2db-294e8ea9c132'::uuid, 'prabalmachi-camping'),
  ('9d534cba-d763-4900-8a3d-3f10383c48b4'::uuid, 'ranjangiri-fort'),
  ('9d9404c3-422e-4769-96d4-04af087bd147'::uuid, 'mandangad-fort'),
  ('9d980de2-95da-495d-b37f-8dbe5cd1708d'::uuid, 'harishchandragad'),
  ('9e05cee4-6e8a-40ae-9907-50ed30800868'::uuid, 'tringalwadi-fort'),
  ('9fd79d0c-d714-4177-9d5e-e078f69085da'::uuid, 'tavli'),
  ('a2493b18-efb9-4010-a74d-ce39f741b721'::uuid, 'kothaligad-trek'),
  ('a4e37102-35cd-45d0-b83a-390e9ae486a9'::uuid, 'ghodbunder-fort'),
  ('a5f9a87b-8d93-4dc4-bdf8-a6daad38b8d4'::uuid, 'shenwad'),
  ('a6052f13-cf88-42c4-b5c6-ce81b378083f'::uuid, 'uttan-beach-camping'),
  ('a6c45dfa-9a97-4b41-9001-961899f803ac'::uuid, 'gopalgad-anjanvel-fort'),
  ('a76fed70-6612-41a7-883a-81a97ffe18c7'::uuid, 'palgad-fort'),
  ('a835f118-8987-40f2-b73e-dc0f3218ac32'::uuid, 'harihar-fort-trek'),
  ('a952ec8b-d242-4cc6-85ce-7b37fac7e52b'::uuid, 'ransai-forest-trail'),
  ('a97bc76c-6ec4-43ae-81c1-af08b79c182d'::uuid, 'samangad-fort'),
  ('aa4c4906-2391-400d-afd9-d3142b046799'::uuid, 'lonavala-bhimashankar-trek'),
  ('aa60d4d4-227a-4d9b-b65e-ddc170bc9899'::uuid, 'vasantgad-fort'),
  ('ac7716da-8d45-4673-8095-7e77a60ec968'::uuid, 'songad-fort'),
  ('adaea543-e623-488b-bae6-369efba18895'::uuid, 'yashwantgad-nate-fort'),
  ('ae497854-1e65-4eb8-b43b-7a7128cce743'::uuid, 'bandra-fort-castella-de-aguada'),
  ('af5752af-777c-4d27-9fa1-878693ceb0f9'::uuid, 'mulher-fort'),
  ('affbbeb1-0921-414f-9829-b810631e69b7'::uuid, 'janjala-vaishagad-fort'),
  ('b07749d9-21fc-419e-8a34-6f7fe52a24db'::uuid, 'laling-fort'),
  ('b09f2c42-f2bc-4a79-bc1f-6e167b8d3b10'::uuid, 'tung'),
  ('b13f2cfd-7d28-446b-a4a0-a7d3b1ee834e'::uuid, 'bahadarpur-fort'),
  ('b2caee46-c609-4caf-a0da-d7b8dd27d171'::uuid, 'dabhosa-waterfall-camping'),
  ('b54d13b8-d8b2-4497-a40e-fe891bdb1a18'::uuid, 'tikona-peak'),
  ('b6947975-9959-469a-846c-738f6bc1a8ff'::uuid, 'tapola-camping'),
  ('b6ea7722-fe2b-4e5c-a3ac-de4f9922cc07'::uuid, 'amk-alang-madan-kulang-trek'),
  ('b702e186-8f51-4c8e-a468-88374f39d755'::uuid, 'vairatgad-fort'),
  ('b88508dc-b22c-4121-a1f8-975aa48311aa'::uuid, 'anjaneri-fort-trek'),
  ('b9b95b0f-2613-4605-8232-97e95f39fbe9'::uuid, 'wilson-hill'),
  ('bc122319-7ca6-412c-bb41-dbdd576f0fb4'::uuid, 'sarjekot-fort-alibaug'),
  ('bdeab47e-aff4-447e-8551-da82045c9b5d'::uuid, 'shivneri-fort'),
  ('bebc10c4-e810-4e0e-bad2-5241ab69b73e'::uuid, 'ambolgad-fort'),
  ('befe1233-4803-40de-b85d-1f46071f4baf'::uuid, 'durga-tekdi'),
  ('bfb3c904-f44b-4f68-8397-ba8c3c64ac5b'::uuid, 'avchitgad'),
  ('c1301c52-c7d9-498e-86a1-6cfaa3291a2a'::uuid, 'bordi-beach-camping'),
  ('c1416ab5-5efa-4b9b-8fe9-2973b20d31f1'::uuid, 'gavilgad-gawilgarh-fort'),
  ('c1a42734-5d90-4b86-866c-3fc4c38af82a'::uuid, 'durg-dhakoba-trek'),
  ('c1de60af-d1ec-4a0a-9243-188594e99999'::uuid, 'visapur'),
  ('c1efce57-a727-4255-a736-69e4c05fd868'::uuid, 'vardhangad-fort'),
  ('c2a5372a-0e76-46d1-9a61-441c267cd536'::uuid, 'vetalgad-pendur-fort'),
  ('c2baad8d-1a89-4c71-b4c4-9bcd0a29916c'::uuid, 'parnera-fort'),
  ('c4fdaa2f-779e-4fe7-a378-0ac769bb761c'::uuid, 'jamgaon-fort'),
  ('c603004e-c9f0-48ac-bf45-c85007634768'::uuid, 'durgadi-fort'),
  ('c6ca952f-31c9-4d0b-a586-961b2256fe40'::uuid, 'bhagwantgad-fort'),
  ('c74fba82-8098-4104-9136-32156ea96327'::uuid, 'sarjekot-fort-malvan'),
  ('c86392db-544b-43e7-97ad-e6274a913156'::uuid, 'mangi-tungi'),
  ('c9060850-34a9-4c0e-a699-15c1f919765c'::uuid, 'bhavangad-fort'),
  ('c93552c6-771c-4957-b0e6-5ddd2ecfff5d'::uuid, 'padargad-fort'),
  ('c970191b-a159-4b31-89de-1f72b3188cea'::uuid, 'kankrala-fort'),
  ('c9ea8b4b-f4b8-45d9-8d07-29d5b7f8cb9d'::uuid, 'vallabhgad-fort'),
  ('ca32a928-e56e-47be-9549-912d3325f0ce'::uuid, 'mordhan-fort'),
  ('ccfc6528-12a9-4e5c-b105-e52cfbec30af'::uuid, 'palghatiya-dongar'),
  ('cdb6cba6-2890-4e26-bf31-c22bf380dc5c'::uuid, 'gaimukh-kanheri-caves-jungle-trail'),
  ('ce1d8084-eeaa-43fb-ab6d-9330ca8436b3'::uuid, 'terekhol-fort'),
  ('ceccde80-555c-48cc-ba9e-53ff9dd72bd9'::uuid, 'lonar-crater-lake-trek'),
  ('d022b5b2-764e-4eee-9948-69df5c4ce9df'::uuid, 'revdanda-fort'),
  ('d0ab6952-c2aa-431e-aa87-69361b5dc566'::uuid, 'malshej-ghat-camping'),
  ('d25ff7a4-f90d-474d-8cfb-4501d78d2c03'::uuid, 'pandavgad-fort'),
  ('d26b2bcc-eab6-4fdc-95f9-def98c7c722f'::uuid, 'raikot-fort-dhule'),
  ('d276032d-47e1-4d34-9b32-f18d01028940'::uuid, 'aad-fort'),
  ('d58f4102-f81b-4584-9dbb-2ad9dc1adbc6'::uuid, 'ahivant-fort'),
  ('d5a0858b-f90d-43f9-a61a-07adbf0f858d'::uuid, 'vajragad'),
  ('d6516adf-24ba-40d2-8457-501a12589708'::uuid, 'nandya-dongar'),
  ('d66fdbfa-2fef-4d0f-9209-6fb8bf3faaaf'::uuid, 'peb-vikatgad'),
  ('d85a07f3-1960-4b41-a2fe-224037e6ee22'::uuid, 'vasind-riverside-camping'),
  ('da53e375-5136-4b4d-b3b3-85740eff98ee'::uuid, 'adai-waterfall'),
  ('db52940c-d345-4e5e-9b25-0c92a8eabb82'::uuid, 'ankai-fort'),
  ('dde4e1a1-2d20-4af7-8f71-91b8129f8e63'::uuid, 'lohagad-fort'),
  ('ddf801cf-2290-481f-a716-143bfa9b6c1c'::uuid, 'igatpuri-camping'),
  ('de94fde1-dadd-472b-9eba-bac9103a7c51'::uuid, 'vishalgad-fort'),
  ('dfa6375e-ef40-4585-8bee-931d2a01869c'::uuid, 'moragad-fort'),
  ('e1cd28a2-76dc-401b-a550-5596df4e8a03'::uuid, 'nimgiri-hanumantgad-fort'),
  ('e376875e-2f3e-43a7-8a48-3bc9ea99ea19'::uuid, 'mohangad-durgadi-fort'),
  ('e4732972-e6f5-48b1-8246-3d6bf684954a'::uuid, 'mrugagad'),
  ('e4eabe70-83be-40e9-a8ef-1f5af84279db'::uuid, 'rajgad'),
  ('e5015f73-f449-4420-a771-8a93fecf4647'::uuid, 'chanderi'),
  ('e67a0426-1e3d-471b-8941-2c00e3b88e69'::uuid, 'madh-fort'),
  ('e6b1d577-a7e8-45d9-93c7-acb4550b09ad'::uuid, 'songiri-fort-karjat-avalas'),
  ('e779c06d-a069-423b-8f4b-1387f65fe861'::uuid, 'rasalgad-fort'),
  ('e8116326-e620-46a3-a6fa-c0ef8a907184'::uuid, 'tamhini-waterfall'),
  ('eaccfe91-0581-4a37-af1f-d92b187b5d98'::uuid, 'kalyangad-fort'),
  ('ead10cea-f9f1-42eb-928b-6b2ece39dff1'::uuid, 'andharban-trek'),
  ('ebb999ce-943a-4a04-b098-09b3f9028d54'::uuid, 'devkund-waterfall'),
  ('f01577fc-b0a2-41c7-b497-2a30ff81796a'::uuid, 'durg-bhandar'),
  ('f04c44a8-d99a-4224-a646-8f409e46e021'::uuid, 'umberkhind-trek'),
  ('f0c266d1-cb42-4ccc-bcc0-8c5c0f619703'::uuid, 'mahim-fort'),
  ('f0c27391-774a-4cb3-aca2-9e5bb3c32fc9'::uuid, 'pisol-fort'),
  ('f15cd381-17c3-45b3-ab13-e4bfa3077e84'::uuid, 'manranjan'),
  ('f1ec0aca-3de1-4792-9c37-4f16d493db5e'::uuid, 'rajhansgad-yellur-fort'),
  ('f28df4ee-c762-45e6-b219-8fcfafbabf47'::uuid, 'trimbakgad-brahmagiri-fort'),
  ('f3eed120-334a-4e5b-8587-4713dc39fa99'::uuid, 'purandar'),
  ('f41ac25a-81e3-4ce1-b138-31e3b51bb46f'::uuid, 'pimpla-kandala-fort'),
  ('f5c8e40b-7832-4a32-90d4-5f17211603c9'::uuid, 'mangalgad-kangori-fort'),
  ('f68f2933-fd55-4377-91ba-e3154a6a0aca'::uuid, 'narayangad-fort'),
  ('f74a647b-f640-4b15-b363-fda4ca28694e'::uuid, 'morgiri-fort'),
  ('fad30908-9749-49fa-a1b9-2b46ef918be4'::uuid, 'rajmachi-camping'),
  ('faefffc3-f5df-4977-90ba-0a82eae511c4'::uuid, 'pawna-lake-camping'),
  ('fb9e5cf9-bf86-4d25-b47a-4a303197eefa'::uuid, 'mahipatgad-fort'),
  ('fc505442-7293-4680-a676-7245f08efbc4'::uuid, 'thalner-fort'),
  ('fc6a43e0-b461-4410-a0a4-94de7aaad171'::uuid, 'vasota-fort'),
  ('fdb79055-cd0c-4123-8b0d-0a8ee5c5233f'::uuid, 'rajdeher-rajdher-fort'),
  ('fe3c17ef-63e8-4ed0-b8c1-6f64616eb5a6'::uuid, 'kavnai-fort-trek'),
  ('fe90f5fd-8182-4250-8caf-fc8812b0d620'::uuid, 'revdanda-beach-camping'),
  ('ff3330dd-f461-48be-ab97-5fbfcd7045e7'::uuid, 'kharghar-hills'),
  ('ffa794a7-a689-4696-92b4-43c759a315b6'::uuid, 'vetal-tekdi')
) as v(id, slug)
where s.id = v.id and s.slug is null;

create table if not exists spot_slug_history (
  old_slug text primary key,
  spot_id uuid not null references spots on delete cascade
);
alter table spot_slug_history enable row level security;
drop policy if exists "spot_slug_history public read" on spot_slug_history;
create policy "spot_slug_history public read" on spot_slug_history for select using (true);

-- Slug generation happens once, when a spot is created.
create or replace function spots_slugify(txt text) returns text language sql immutable as $f$
  select trim(both '-' from regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9]+', '-', 'g'))
$f$;

create or replace function spots_next_slug(p_name text, p_category text, p_region text) returns text language plpgsql as $f$
declare base text; candidate text; n int := 1;
begin
  base := spots_slugify(p_name);
  if base = '' then
    base := p_category || '-' || coalesce(nullif(spots_slugify(p_region), ''), 'maharashtra');
  end if;
  candidate := base;
  while exists (select 1 from spots where slug = candidate)
     or exists (select 1 from spot_slug_history where old_slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $f$;

create or replace function spots_set_slug() returns trigger language plpgsql as $f$
begin
  if new.slug is null or new.slug = '' then
    new.slug := spots_next_slug(new.name, new.category::text, new.region);
  end if;
  return new;
end $f$;

drop trigger if exists spots_slug_insert on spots;
create trigger spots_slug_insert before insert on spots for each row execute function spots_set_slug();

-- Rows not on the live site (e.g. drafts) get a generated slug, one at a time so collisions resolve.
do $d$
declare r record;
begin
  for r in select id, name, category, region from spots where slug is null order by id loop
    update spots set slug = spots_next_slug(r.name, r.category::text, r.region) where id = r.id;
  end loop;
end $d$;

alter table spots alter column slug set not null;
alter table spots drop constraint if exists spots_slug_key;
alter table spots add constraint spots_slug_key unique (slug);

-- Keep old URLs working when a spot is renamed.
create or replace function spots_keep_old_slug() returns trigger language plpgsql as $$
begin
  if new.slug <> old.slug then
    insert into spot_slug_history values (old.slug, old.id)
    on conflict (old_slug) do update set spot_id = excluded.spot_id;
  end if;
  return new;
end $$;
drop trigger if exists spots_slug_change on spots;
create trigger spots_slug_change before update of slug on spots for each row execute function spots_keep_old_slug();
