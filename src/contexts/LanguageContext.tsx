import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type LanguageCode = 'en' | 'zu' | 'xh' | 'st' | 'tn' | 'af' | 'nso' | 'ts' | 'sna' | 'nde';

interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'sna', name: 'Shona', nativeName: 'chiShona', flag: '🇿🇼' },
  { code: 'nde', name: 'Ndebele', nativeName: 'isiNdebele', flag: '🇿🇼' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦' },
  { code: 'st', name: 'Sotho', nativeName: 'Sesotho', flag: '🇿🇦' },
  { code: 'tn', name: 'Tswana', nativeName: 'Setswana', flag: '🇿🇦' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'nso', name: 'Northern Sotho', nativeName: 'Sepedi', flag: '🇿🇦' },
  { code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga', flag: '🇿🇦' },
];

// Translation keys
type TranslationKey = 
  | 'nav.home' | 'nav.dashboard' | 'nav.lessons' | 'nav.transcripts' | 'nav.help' | 'nav.profile' | 'nav.logout' | 'nav.install'
  | 'common.loading' | 'common.save' | 'common.cancel' | 'common.delete' | 'common.edit' | 'common.back' | 'common.next' | 'common.search' | 'common.noResults' | 'common.welcome'
  | 'auth.login' | 'auth.signup' | 'auth.email' | 'auth.password' | 'auth.forgotPassword' | 'auth.confirmEmail'
  | 'teacher.dashboard' | 'teacher.startLesson' | 'teacher.manageLessons' | 'teacher.todaysLessons' | 'teacher.upcomingLessons' | 'teacher.students' | 'teacher.materials' | 'teacher.attendance' | 'teacher.noLessonsToday' | 'teacher.quickActions' | 'teacher.broadcast' | 'teacher.continueBroadcast' | 'teacher.copyLink' | 'teacher.shareWhatsApp'
  | 'student.timetable' | 'student.joinNow' | 'student.liveNow' | 'student.noLessons' | 'student.contactTeacher' | 'student.weeklySchedule' | 'student.todaySchedule' | 'student.myTranscripts'
  | 'lesson.title' | 'lesson.description' | 'lesson.day' | 'lesson.time' | 'lesson.recurring' | 'lesson.session' | 'lesson.create' | 'lesson.duplicate'
  | 'settings.textSize' | 'settings.language' | 'settings.dataSaver' | 'settings.loadShedding' | 'settings.connectivity' | 'settings.batteryLow'
  | 'offline.youAreOffline' | 'offline.changesWillSync' | 'offline.backOnline'
  | 'data.estimatedUsage' | 'data.saved' | 'data.mbUsed'
  | 'day.sunday' | 'day.monday' | 'day.tuesday' | 'day.wednesday' | 'day.thursday' | 'day.friday' | 'day.saturday'
  | 'common.students' | 'common.start' | 'common.viewAll' | 'common.helpCenter' | 'common.installApp' | 'common.noUpcoming' | 'common.createLesson' | 'common.welcomeBack' | 'common.live' | 'common.readyToStart' | 'common.classTime';

type Translations = Record<TranslationKey, string>;
type PartialTranslations = Partial<Translations>;

const translations: Record<LanguageCode, PartialTranslations> = {
  en: {
    'nav.home': 'Home', 'nav.dashboard': 'Dashboard', 'nav.lessons': 'Lessons', 'nav.transcripts': 'Transcripts', 'nav.help': 'Help & Settings', 'nav.profile': 'My Profile', 'nav.logout': 'Logout', 'nav.install': 'Install App',
    'common.loading': 'Loading...', 'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit', 'common.back': 'Back', 'common.next': 'Next', 'common.search': 'Search', 'common.noResults': 'No results found', 'common.welcome': 'Welcome',
    'auth.login': 'Log In', 'auth.signup': 'Sign Up', 'auth.email': 'Email', 'auth.password': 'Password', 'auth.forgotPassword': 'Forgot password?', 'auth.confirmEmail': 'Please check your email to confirm your account',
    'teacher.dashboard': 'Teacher Dashboard', 'teacher.startLesson': 'Start Lesson', 'teacher.manageLessons': 'Manage Lessons', 'teacher.todaysLessons': "Today's Lessons", 'teacher.upcomingLessons': 'Upcoming Lessons', 'teacher.students': 'Students', 'teacher.materials': 'Materials', 'teacher.attendance': 'Attendance', 'teacher.noLessonsToday': 'No lessons scheduled for today', 'teacher.quickActions': 'Quick Actions', 'teacher.broadcast': 'Start Lesson', 'teacher.continueBroadcast': 'Continue Broadcast', 'teacher.copyLink': 'Copy Link', 'teacher.shareWhatsApp': 'Share via WhatsApp',
    'student.timetable': 'My Timetable', 'student.joinNow': 'Join Now', 'student.liveNow': 'Live Classes Now', 'student.noLessons': 'No lessons assigned yet', 'student.contactTeacher': 'Contact your teacher to be enrolled in lessons', 'student.weeklySchedule': 'Weekly Schedule', 'student.todaySchedule': "Today's Schedule", 'student.myTranscripts': 'My Transcripts',
    'lesson.title': 'Lesson Title', 'lesson.description': 'Description', 'lesson.day': 'Day', 'lesson.time': 'Time', 'lesson.recurring': 'Recurring Weekly', 'lesson.session': 'Session', 'lesson.create': 'Create Lesson', 'lesson.duplicate': 'Duplicate Lesson',
    'settings.textSize': 'Text Size', 'settings.language': 'Language', 'settings.dataSaver': 'Data Saver', 'settings.loadShedding': 'Load Shedding Mode', 'settings.connectivity': 'Connectivity & Power', 'settings.batteryLow': 'Battery is low',
    'offline.youAreOffline': 'You are offline', 'offline.changesWillSync': 'Changes will sync when you reconnect', 'offline.backOnline': 'Back online',
    'data.estimatedUsage': 'Estimated data usage', 'data.saved': 'Data saved', 'data.mbUsed': 'MB used',
    'day.sunday': 'Sunday', 'day.monday': 'Monday', 'day.tuesday': 'Tuesday', 'day.wednesday': 'Wednesday', 'day.thursday': 'Thursday', 'day.friday': 'Friday', 'day.saturday': 'Saturday',
    'common.students': 'students', 'common.start': 'Start', 'common.viewAll': 'View All', 'common.helpCenter': 'Help Center', 'common.installApp': 'Install App', 'common.noUpcoming': 'No upcoming lessons this week', 'common.createLesson': 'Create a new lesson', 'common.welcomeBack': 'Welcome back', 'common.live': 'LIVE', 'common.readyToStart': 'Ready to Start', 'common.classTime': 'Class Time',
  },
  zu: {
    'nav.home': 'Ikhaya', 'nav.dashboard': 'Ideshbhodi', 'nav.lessons': 'Izifundo', 'nav.transcripts': 'Imibhalo', 'nav.help': 'Usizo Nezilungiselelo', 'nav.profile': 'Iphrofayela Yami', 'nav.logout': 'Phuma', 'nav.install': 'Faka Uhlelo Lokusebenza',
    'common.loading': 'Iyalayisha...', 'common.save': 'Gcina', 'common.cancel': 'Khansela', 'common.delete': 'Susa', 'common.edit': 'Hlela', 'common.back': 'Emuva', 'common.next': 'Okulandelayo', 'common.search': 'Sesha', 'common.noResults': 'Akukho miphumela etholakele', 'common.welcome': 'Siyakwamukela',
    'auth.login': 'Ngena', 'auth.signup': 'Bhalisa', 'auth.email': 'I-imeyili', 'auth.password': 'Iphasiwedi', 'auth.forgotPassword': 'Ukhohlwe iphasiwedi?', 'auth.confirmEmail': 'Sicela uhlole i-imeyili yakho ukuqinisekisa i-akhawunti yakho',
    'teacher.dashboard': 'Ideshbhodi Kathisha', 'teacher.startLesson': 'Qala Isifundo', 'teacher.manageLessons': 'Phatha Izifundo', 'teacher.todaysLessons': 'Izifundo Zanamuhla', 'teacher.upcomingLessons': 'Izifundo Ezizayo', 'teacher.students': 'Abafundi', 'teacher.materials': 'Izinsiza', 'teacher.attendance': 'Ukuza', 'teacher.noLessonsToday': 'Azikho izifundo ezihlelelwe namuhla', 'teacher.quickActions': 'Izenzo Ezisheshayo', 'teacher.broadcast': 'Qala Isifundo', 'teacher.continueBroadcast': 'Qhubeka Nokusakaza', 'teacher.copyLink': 'Kopisha Isixhumanisi', 'teacher.shareWhatsApp': 'Yabelana nge-WhatsApp',
    'student.timetable': 'Ithayimuthebuli Yami', 'student.joinNow': 'Joyina Manje', 'student.liveNow': 'Amakilasi Abukhoma Manje', 'student.noLessons': 'Azikho izifundo ozabelwe', 'student.contactTeacher': 'Xhumana nothisha wakho ukuze ubhaliswe ezifundweni', 'student.weeklySchedule': 'Isheduli Yamasonto Onke', 'student.todaySchedule': 'Isheduli Yanamuhla', 'student.myTranscripts': 'Imibhalo Yami',
    'lesson.title': 'Isihloko Sesifundo', 'lesson.description': 'Incazelo', 'lesson.day': 'Usuku', 'lesson.time': 'Isikhathi', 'lesson.recurring': 'Kuphindaphinda Njalo Ngesonto', 'lesson.session': 'Iseshini', 'lesson.create': 'Dala Isifundo', 'lesson.duplicate': 'Phinda Isifundo',
    'settings.textSize': 'Usayizi Wombhalo', 'settings.language': 'Ulimi', 'settings.dataSaver': 'Isigcini Sedatha', 'settings.loadShedding': 'Imodi Yokucisha Ugesi', 'settings.connectivity': 'Ukuxhumana Namandla', 'settings.batteryLow': 'Ibhethri liphansi',
    'offline.youAreOffline': 'Awuxhunyiwe', 'offline.changesWillSync': 'Izinguquko zizovumelaniswa uma uxhuma kabusha', 'offline.backOnline': 'Usuxhunyiwe futhi',
    'data.estimatedUsage': 'Ukusetshenziswa kwedatha okulinganiselwe', 'data.saved': 'Idatha egcinwe', 'data.mbUsed': 'MB ezisetshenzisiwe',
    'day.sunday': 'ISonto', 'day.monday': 'UMsombuluko', 'day.tuesday': 'ULwesibili', 'day.wednesday': 'ULwesithathu', 'day.thursday': 'ULwesine', 'day.friday': 'ULwesihlanu', 'day.saturday': 'UMgqibelo',
    'common.students': 'abafundi', 'common.start': 'Qala', 'common.viewAll': 'Buka Konke', 'common.helpCenter': 'Isikhungo Sosizo', 'common.installApp': 'Faka Uhlelo', 'common.noUpcoming': 'Azikho izifundo ezizayo kule viki', 'common.createLesson': 'Dala isifundo esisha', 'common.welcomeBack': 'Siyakwamukela futhi', 'common.live': 'BUKHOMA', 'common.readyToStart': 'Kulungile Ukuqala', 'common.classTime': 'Isikhathi Sekilasi',
  },
  xh: {
    'nav.home': 'Ikhaya', 'nav.dashboard': 'Idashbhodi', 'nav.lessons': 'Izifundo', 'nav.transcripts': 'Imibhalo', 'nav.help': 'Uncedo Nezicwangciso', 'nav.profile': 'Iprofayile Yam', 'nav.logout': 'Phuma', 'nav.install': 'Faka i-App',
    'common.loading': 'Iyalayisha...', 'common.save': 'Gcina', 'common.cancel': 'Rhoxisa', 'common.delete': 'Cima', 'common.edit': 'Hlela', 'common.back': 'Emva', 'common.next': 'Elandelayo', 'common.search': 'Khangela', 'common.noResults': 'Akukho ziphumo zifunyenweyo', 'common.welcome': 'Wamkelekile',
    'auth.login': 'Ngena', 'auth.signup': 'Bhalisa', 'auth.email': 'I-imeyile', 'auth.password': 'Iphaswedi', 'auth.forgotPassword': 'Ulibele iphaswedi?', 'auth.confirmEmail': 'Nceda ujonge i-imeyile yakho ukuqinisekisa iakhawunti yakho',
    'teacher.dashboard': 'Idashbhodi Katitshala', 'teacher.startLesson': 'Qala Isifundo', 'teacher.manageLessons': 'Lawula Izifundo', 'teacher.todaysLessons': 'Izifundo Zanamhlanje', 'teacher.upcomingLessons': 'Izifundo Ezizayo', 'teacher.students': 'Abafundi', 'teacher.materials': 'Izixhobo', 'teacher.attendance': 'Ukubakho', 'teacher.noLessonsToday': 'Akukho zifundo ezibekelwe namhlanje', 'teacher.quickActions': 'Izenzo Ezikhawulezayo', 'teacher.broadcast': 'Qala Isifundo', 'teacher.continueBroadcast': 'Qhubeka Nokusakaza', 'teacher.copyLink': 'Kopisha Ilinki', 'teacher.shareWhatsApp': 'Yabelana nge-WhatsApp',
    'student.timetable': 'Ithayimtheyibhile Yam', 'student.joinNow': 'Joyina Ngoku', 'student.liveNow': 'Iiklasi Eziphilayo Ngoku', 'student.noLessons': 'Akukho zifundo onikezwe zona', 'student.contactTeacher': 'Qhagamshelana notitshala wakho ukuze ubhaliswe kwizifundo', 'student.weeklySchedule': 'Ishedyuli Yeveki', 'student.todaySchedule': 'Ishedyuli Yanamhlanje', 'student.myTranscripts': 'Imibhalo Yam',
    'lesson.title': 'Isihloko Sesifundo', 'lesson.description': 'Inkcazelo', 'lesson.day': 'Usuku', 'lesson.time': 'Ixesha', 'lesson.recurring': 'Iphinda Veki Nganye', 'lesson.session': 'Iseshoni', 'lesson.create': 'Yenza Isifundo', 'lesson.duplicate': 'Phinda Isifundo',
    'settings.textSize': 'Ubungakanani Bombhalo', 'settings.language': 'Ulwimi', 'settings.dataSaver': 'Isigcini Sedatha', 'settings.loadShedding': 'Imowudi Yokucima Umbane', 'settings.connectivity': 'Unxibelelwano Namandla', 'settings.batteryLow': 'Ibhetri iphantsi',
    'offline.youAreOffline': 'Awudibananga ne-intanethi', 'offline.changesWillSync': 'Iinguqu ziya kuvumelaniswa xa udibanisa kwakhona', 'offline.backOnline': 'Ubuyile kwi-intanethi',
    'data.estimatedUsage': 'Ukusetyenziswa kwedatha okuqikelelweyo', 'data.saved': 'Idatha egciniweyo', 'data.mbUsed': 'MB ezisetyenzisiweyo',
  },
  st: {
    'nav.home': 'Lehae', 'nav.dashboard': 'Dashboto', 'nav.lessons': 'Dithuto', 'nav.transcripts': 'Dingolwa', 'nav.help': 'Thuso le Ditlhophiso', 'nav.profile': 'Profaele ya Ka', 'nav.logout': 'Tswa', 'nav.install': 'Kenya App',
    'common.loading': 'E a laela...', 'common.save': 'Boloka', 'common.cancel': 'Hlakola', 'common.delete': 'Hlakola', 'common.edit': 'Fetola', 'common.back': 'Morao', 'common.next': 'E latelang', 'common.search': 'Batla', 'common.noResults': 'Ha ho diphetho tse fumanehoeng', 'common.welcome': 'Rea o amohela',
    'auth.login': 'Kena', 'auth.signup': 'Ingodisa', 'auth.email': 'Imeile', 'auth.password': 'Phasewete', 'auth.forgotPassword': 'O lebetse phasewete?', 'auth.confirmEmail': 'Ka kopo sheba imeile ya hao ho netefatsa akhaonto ya hao',
    'teacher.dashboard': 'Dashboto ya Morutisi', 'teacher.startLesson': 'Qala Thuto', 'teacher.manageLessons': 'Laola Dithuto', 'teacher.todaysLessons': 'Dithuto tsa Kajeno', 'teacher.upcomingLessons': 'Dithuto tse Tlang', 'teacher.students': 'Baithuti', 'teacher.materials': 'Disebediswa', 'teacher.attendance': 'Ho ba teng', 'teacher.noLessonsToday': 'Ha ho dithuto tse reretsoeng kajeno', 'teacher.quickActions': 'Diketso tse Potlakileng', 'teacher.broadcast': 'Qala Thuto', 'teacher.continueBroadcast': 'Tswela Pele ho Phatlalatsa', 'teacher.copyLink': 'Kopitsa Linki', 'teacher.shareWhatsApp': 'Arolelana ka WhatsApp',
    'student.timetable': 'Tafole ya ka ya Nako', 'student.joinNow': 'Kena Jwale', 'student.liveNow': 'Diklasi tse Phetseng Jwale', 'student.noLessons': 'Ha ho dithuto tse abetsoeng', 'student.contactTeacher': 'Ikopanye le morutisi wa hao ho ingodiswa dithutong', 'student.weeklySchedule': 'Lenaneo la Beke', 'student.todaySchedule': 'Lenaneo la Kajeno', 'student.myTranscripts': 'Dingolwa tsa Ka',
    'lesson.title': 'Sehlooho sa Thuto', 'lesson.description': 'Tlhaloso', 'lesson.day': 'Letsatsi', 'lesson.time': 'Nako', 'lesson.recurring': 'E Iphetang Beke le Beke', 'lesson.session': 'Seshene', 'lesson.create': 'Etsa Thuto', 'lesson.duplicate': 'Pheta Thuto',
    'settings.textSize': 'Boholo ba Mongolo', 'settings.language': 'Puo', 'settings.dataSaver': 'Moboloki wa Data', 'settings.loadShedding': 'Mokgwa wa ho Kgaola Motlakase', 'settings.connectivity': 'Tshwaragano le Matla', 'settings.batteryLow': 'Betteri e tlase',
    'offline.youAreOffline': 'Ha o hokahane', 'offline.changesWillSync': 'Diphetoho di tla lumellana ha o hokahana hape', 'offline.backOnline': 'O kgutlile inthaneteng',
    'data.estimatedUsage': 'Tshebediso ya data e hakantsweng', 'data.saved': 'Data e bolokilweng', 'data.mbUsed': 'MB tse sebedisitsweng',
  },
  tn: {
    'nav.home': 'Gae', 'nav.dashboard': 'Dashboto', 'nav.lessons': 'Dithuto', 'nav.transcripts': 'Dikwalwa', 'nav.help': 'Thuso le Ditlhophiso', 'nav.profile': 'Porofaele ya Me', 'nav.logout': 'Tswa', 'nav.install': 'Tsenya App',
    'common.loading': 'E a lôla...', 'common.save': 'Boloka', 'common.cancel': 'Khansela', 'common.delete': 'Phimola', 'common.edit': 'Fetola', 'common.back': 'Morago', 'common.next': 'E e latelang', 'common.search': 'Batla', 'common.noResults': 'Ga go na dipholo tse di fitlhetsweng', 'common.welcome': 'O a amogela',
    'auth.login': 'Tsena', 'auth.signup': 'Ikwadise', 'auth.email': 'Imeile', 'auth.password': 'Phasewete', 'auth.forgotPassword': 'O lebetse phasewete?', 'auth.confirmEmail': 'Tswêtswê leba imeile ya gago go netefatsa akhaonto ya gago',
    'teacher.dashboard': 'Dashboto ya Morutabana', 'teacher.startLesson': 'Simolola Thuto', 'teacher.manageLessons': 'Laola Dithuto', 'teacher.todaysLessons': 'Dithuto tsa Gompieno', 'teacher.upcomingLessons': 'Dithuto tse di Tlang', 'teacher.students': 'Baithuti', 'teacher.materials': 'Didiriswa', 'teacher.attendance': 'Go nna teng', 'teacher.noLessonsToday': 'Ga go na dithuto tse di rulagantsweng gompieno', 'teacher.quickActions': 'Ditiro tse di Bonako', 'teacher.broadcast': 'Simolola Thuto', 'teacher.continueBroadcast': 'Tswelela go Phatlalatsa', 'teacher.copyLink': 'Kôpisa Linki', 'teacher.shareWhatsApp': 'Abelana ka WhatsApp',
    'student.timetable': 'Tafole ya Me ya Nako', 'student.joinNow': 'Tsena Jaanong', 'student.liveNow': 'Diklasi tse di Tshelang Jaanong', 'student.noLessons': 'Ga go na dithuto tse di abetsweng', 'student.contactTeacher': 'Ikgolaganye le morutabana wa gago go kwadisiwa mo dithutong', 'student.weeklySchedule': 'Lenaneo la Beke', 'student.todaySchedule': 'Lenaneo la Gompieno', 'student.myTranscripts': 'Dikwalwa tsa Me',
    'lesson.title': 'Setlhogo sa Thuto', 'lesson.description': 'Tlhaloso', 'lesson.day': 'Letsatsi', 'lesson.time': 'Nako', 'lesson.recurring': 'E Iphetang Beke le Beke', 'lesson.session': 'Seshene', 'lesson.create': 'Bopa Thuto', 'lesson.duplicate': 'Phetelela Thuto',
    'settings.textSize': 'Bogolo jwa Mongwalo', 'settings.language': 'Puo', 'settings.dataSaver': 'Moboloki wa Data', 'settings.loadShedding': 'Mokgwa wa go Kgaola Motlakase', 'settings.connectivity': 'Kgolagano le Maatla', 'settings.batteryLow': 'Betri e kwa tlase',
    'offline.youAreOffline': 'Ga o a golagana', 'offline.changesWillSync': 'Diphetogo di tla rulagana fa o golagana gape', 'offline.backOnline': 'O kgutlile mo inthaneteng',
    'data.estimatedUsage': 'Tiriso ya data e e akanngwang', 'data.saved': 'Data e e bolokilweng', 'data.mbUsed': 'MB tse di dirisitsweng',
  },
  af: {
    'nav.home': 'Tuis', 'nav.dashboard': 'Kontroleskerm', 'nav.lessons': 'Lesse', 'nav.transcripts': 'Transkripsies', 'nav.help': 'Hulp & Instellings', 'nav.profile': 'My Profiel', 'nav.logout': 'Teken Uit', 'nav.install': 'Installeer App',
    'common.loading': 'Laai...', 'common.save': 'Stoor', 'common.cancel': 'Kanselleer', 'common.delete': 'Verwyder', 'common.edit': 'Wysig', 'common.back': 'Terug', 'common.next': 'Volgende', 'common.search': 'Soek', 'common.noResults': 'Geen resultate gevind nie', 'common.welcome': 'Welkom',
    'auth.login': 'Teken In', 'auth.signup': 'Registreer', 'auth.email': 'E-pos', 'auth.password': 'Wagwoord', 'auth.forgotPassword': 'Wagwoord vergeet?', 'auth.confirmEmail': 'Kyk asseblief jou e-pos na om jou rekening te bevestig',
    'teacher.dashboard': 'Onderwyser Kontroleskerm', 'teacher.startLesson': 'Begin Les', 'teacher.manageLessons': 'Bestuur Lesse', 'teacher.todaysLessons': 'Vandag se Lesse', 'teacher.upcomingLessons': 'Komende Lesse', 'teacher.students': 'Studente', 'teacher.materials': 'Materiaal', 'teacher.attendance': 'Bywoning', 'teacher.noLessonsToday': 'Geen lesse geskeduleer vir vandag nie', 'teacher.quickActions': 'Vinnige Aksies', 'teacher.broadcast': 'Begin Les', 'teacher.continueBroadcast': 'Gaan voort met Uitsending', 'teacher.copyLink': 'Kopieer Skakel', 'teacher.shareWhatsApp': 'Deel via WhatsApp',
    'student.timetable': 'My Rooster', 'student.joinNow': 'Sluit Nou Aan', 'student.liveNow': 'Lewendige Klasse Nou', 'student.noLessons': 'Nog geen lesse toegewys nie', 'student.contactTeacher': 'Kontak jou onderwyser om vir lesse ingeskryf te word', 'student.weeklySchedule': 'Weeklikse Skedule', 'student.todaySchedule': 'Vandag se Skedule', 'student.myTranscripts': 'My Transkripsies',
    'lesson.title': 'Les Titel', 'lesson.description': 'Beskrywing', 'lesson.day': 'Dag', 'lesson.time': 'Tyd', 'lesson.recurring': 'Weekliks Herhalend', 'lesson.session': 'Sessie', 'lesson.create': 'Skep Les', 'lesson.duplicate': 'Dupliseer Les',
    'settings.textSize': 'Teksgrootte', 'settings.language': 'Taal', 'settings.dataSaver': 'Databespaarder', 'settings.loadShedding': 'Beurtkrag Modus', 'settings.connectivity': 'Konnektiwiteit & Krag', 'settings.batteryLow': 'Battery is laag',
    'offline.youAreOffline': 'Jy is vanlyn', 'offline.changesWillSync': 'Veranderinge sal sinkroniseer wanneer jy weer koppel', 'offline.backOnline': 'Terug aanlyn',
    'data.estimatedUsage': 'Geskatte datagebruik', 'data.saved': 'Data gespaar', 'data.mbUsed': 'MB gebruik',
  },
  nso: {
    'nav.home': 'Gae', 'nav.dashboard': 'Dashboto', 'nav.lessons': 'Dithuto', 'nav.transcripts': 'Dikwalwa', 'nav.help': 'Thušo le Dipeakanyo', 'nav.profile': 'Profaele ya Ka', 'nav.logout': 'Tšwa', 'nav.install': 'Kenya App',
    'common.loading': 'E a laela...', 'common.save': 'Boloka', 'common.cancel': 'Khansela', 'common.delete': 'Phumula', 'common.edit': 'Fetola', 'common.back': 'Morago', 'common.next': 'E latelago', 'common.search': 'Nyaka', 'common.noResults': 'Ga go na diphelo tše di hweditšwego', 'common.welcome': 'O a amogela',
    'auth.login': 'Tsena', 'auth.signup': 'Ingwadiša', 'auth.email': 'Imeili', 'auth.password': 'Phasewete', 'auth.forgotPassword': 'O lebetše phasewete?', 'auth.confirmEmail': 'Ka kgopelo leba imeili ya gago go netefatša akhaonto ya gago',
    'teacher.dashboard': 'Dashboto ya Morutiši', 'teacher.startLesson': 'Thoma Thuto', 'teacher.manageLessons': 'Laola Dithuto', 'teacher.todaysLessons': 'Dithuto tša Lehono', 'teacher.upcomingLessons': 'Dithuto tše di Tlago', 'teacher.students': 'Baithuti', 'teacher.materials': 'Didirišwa', 'teacher.attendance': 'Go ba gona', 'teacher.noLessonsToday': 'Ga go na dithuto tše di beakantšwego lehono', 'teacher.quickActions': 'Ditiro tše di Potlakago', 'teacher.broadcast': 'Thoma Thuto', 'teacher.continueBroadcast': 'Tšwela Pele go Phatlalatša', 'teacher.copyLink': 'Kopiša Linki', 'teacher.shareWhatsApp': 'Abelana ka WhatsApp',
    'student.timetable': 'Tafola ya Ka ya Nako', 'student.joinNow': 'Tsena Bjale', 'student.liveNow': 'Diklasi tše di Phelago Bjale', 'student.noLessons': 'Ga go na dithuto tše di abetšwego', 'student.contactTeacher': 'Ikgolaganye le morutiši wa gago go ingwadišwa dithutong', 'student.weeklySchedule': 'Lenaneo la Beke', 'student.todaySchedule': 'Lenaneo la Lehono', 'student.myTranscripts': 'Dikwalwa tša Ka',
    'lesson.title': 'Sehlogo sa Thuto', 'lesson.description': 'Tlhalošo', 'lesson.day': 'Letšatši', 'lesson.time': 'Nako', 'lesson.recurring': 'E Iphetago Beke le Beke', 'lesson.session': 'Seshene', 'lesson.create': 'Hlama Thuto', 'lesson.duplicate': 'Phetelela Thuto',
    'settings.textSize': 'Bogolo bja Mongwalo', 'settings.language': 'Polelo', 'settings.dataSaver': 'Moboloki wa Data', 'settings.loadShedding': 'Mokgwa wa go Kgaola Mohlagase', 'settings.connectivity': 'Kgolagano le Maatla', 'settings.batteryLow': 'Phetri e fase',
    'offline.youAreOffline': 'Ga o a golagana', 'offline.changesWillSync': 'Diphetogo di tla rulagana ge o golagana gape', 'offline.backOnline': 'O kgutletše inthaneteng',
    'data.estimatedUsage': 'Tirišo ya data e e akanywago', 'data.saved': 'Data e e bolokilwego', 'data.mbUsed': 'MB tše di dirišitšwego',
  },
  ts: {
    'nav.home': 'Kaya', 'nav.dashboard': 'Dashbodo', 'nav.lessons': 'Swifundzo', 'nav.transcripts': 'Switsalwa', 'nav.help': 'Mpfuno na Switirhisiwa', 'nav.profile': 'Profayili ya Mina', 'nav.logout': 'Huma', 'nav.install': 'Nghenisa App',
    'common.loading': 'Yi loda...', 'common.save': 'Hlayisa', 'common.cancel': 'Khansela', 'common.delete': 'Susa', 'common.edit': 'Cinca', 'common.back': 'Endzhaku', 'common.next': 'Leri landzelaka', 'common.search': 'Lava', 'common.noResults': 'A ku na mbuyelo lowu kumekaka', 'common.welcome': 'U amukelekile',
    'auth.login': 'Nghena', 'auth.signup': 'Tsarisa', 'auth.email': 'Imeyli', 'auth.password': 'Phasiwedi', 'auth.forgotPassword': 'U rivele phasiwedi?', 'auth.confirmEmail': 'Hi kombela u languta imeyli ya wena ku tiyisisa akhawunti ya wena',
    'teacher.dashboard': 'Dashbodo ya Mudyondzisi', 'teacher.startLesson': 'Sungula Xifundzo', 'teacher.manageLessons': 'Lawula Swifundzo', 'teacher.todaysLessons': 'Swifundzo swa Namuntlha', 'teacher.upcomingLessons': 'Swifundzo swo Ta', 'teacher.students': 'Vadyondzi', 'teacher.materials': 'Switirhisiwa', 'teacher.attendance': 'Ku va kona', 'teacher.noLessonsToday': 'A ku na swifundzo leswi hleriweriki namuntlha', 'teacher.quickActions': 'Swiendlo swo Hatla', 'teacher.broadcast': 'Sungula Xifundzo', 'teacher.continueBroadcast': 'Yisa Emahlweni ku Hangalasa', 'teacher.copyLink': 'Kopisa Linki', 'teacher.shareWhatsApp': 'Avelana hi WhatsApp',
    'student.timetable': 'Thayimuthebula ya Mina', 'student.joinNow': 'Joyina Sweswi', 'student.liveNow': 'Tikhilasi leti Hanyaka Sweswi', 'student.noLessons': 'A ku na swifundzo leswi averiweke', 'student.contactTeacher': 'Tihlanganise na mudyondzisi wa wena ku tsarisiwa eka swifundzo', 'student.weeklySchedule': 'Xedyulu ya Vhiki', 'student.todaySchedule': 'Xedyulu ya Namuntlha', 'student.myTranscripts': 'Switsalwa swa Mina',
    'lesson.title': 'Nhlokomhaka ya Xifundzo', 'lesson.description': 'Nhlamuselo', 'lesson.day': 'Siku', 'lesson.time': 'Nkarhi', 'lesson.recurring': 'Yi Tlhela Vhiki Rin\'wana na Rin\'wana', 'lesson.session': 'Xesheni', 'lesson.create': 'Tumbuluxa Xifundzo', 'lesson.duplicate': 'Phindha Xifundzo',
    'settings.textSize': 'Xikalo xa Tsalwa', 'settings.language': 'Ririmi', 'settings.dataSaver': 'Muhlayisi wa Data', 'settings.loadShedding': 'Modi ya Ku Tsema Gezi', 'settings.connectivity': 'Vuxokoxoko na Matimba', 'settings.batteryLow': 'Bhetri yi le hansi',
    'offline.youAreOffline': 'A wu hlangananga', 'offline.changesWillSync': 'Ku cinca ku ta lulamisiwa loko u hlangana nakambe', 'offline.backOnline': 'U tlhele u le ka inthanete',
    'data.estimatedUsage': 'Ku tirhisiwa ka data loku akaniwaka', 'data.saved': 'Data leyi hlayisiweke', 'data.mbUsed': 'MB leti tirhisiweke',
  },
  sna: {
    'nav.home': 'Kumba', 'nav.dashboard': 'Dheshibhodhi', 'nav.lessons': 'Zvidzidzo', 'nav.transcripts': 'Zvinyorwa', 'nav.help': 'Rubatsiro & Masettings', 'nav.profile': 'Profairi Yangu', 'nav.logout': 'Buda', 'nav.install': 'Isa App',
    'common.loading': 'Iri kurodha...', 'common.save': 'Sevha', 'common.cancel': 'Kanzura', 'common.delete': 'Bvisa', 'common.edit': 'Gadziridza', 'common.back': 'Shure', 'common.next': 'Inotevera', 'common.search': 'Tsvaka', 'common.noResults': 'Hapana zvawanikwa', 'common.welcome': 'Mauya',
    'auth.login': 'Pinda', 'auth.signup': 'Nyoresa', 'auth.email': 'Imeiri', 'auth.password': 'Pasiwedhi', 'auth.forgotPassword': 'Wakanganwa pasiwedhi?', 'auth.confirmEmail': 'Tarisa imeiri yako kuti usimbise akaundi yako',
    'teacher.dashboard': 'Dheshibhodhi yeMudzidzisi', 'teacher.startLesson': 'Tanga Chidzidzo', 'teacher.manageLessons': 'Rongedza Zvidzidzo', 'teacher.todaysLessons': 'Zvidzidzo zveNhasi', 'teacher.upcomingLessons': 'Zvidzidzo Zvinouya', 'teacher.students': 'Vadzidzi', 'teacher.materials': 'Zvekushandisa', 'teacher.attendance': 'Kupinda', 'teacher.noLessonsToday': 'Hapana zvidzidzo zvakagadzirirwa nhasi', 'teacher.quickActions': 'Zvekuita Zvekukurumidza', 'teacher.broadcast': 'Tanga Chidzidzo', 'teacher.continueBroadcast': 'Enderera Kusakaza', 'teacher.copyLink': 'Kopera Linki', 'teacher.shareWhatsApp': 'Govana neWhatsApp',
    'student.timetable': 'Timetable Yangu', 'student.joinNow': 'Pinda Iye Zvino', 'student.liveNow': 'Makirasi Ari Kuitika Iye Zvino', 'student.noLessons': 'Hapana zvidzidzo zvaunayo', 'student.contactTeacher': 'Taura nemudzidzisi wako kuti unyoreswe muzvidzidzo', 'student.weeklySchedule': 'Purani yeVhiki', 'student.todaySchedule': 'Purani yeNhasi', 'student.myTranscripts': 'Zvinyorwa Zvangu',
    'lesson.title': 'Musoro weChidzidzo', 'lesson.description': 'Tsananguro', 'lesson.day': 'Zuva', 'lesson.time': 'Nguva', 'lesson.recurring': 'Inodzokororwa Vhiki neVhiki', 'lesson.session': 'Sesheni', 'lesson.create': 'Gadzira Chidzidzo', 'lesson.duplicate': 'Dhabhura Chidzidzo',
    'settings.textSize': 'Kukura kweChinyorwa', 'settings.language': 'Mutauro', 'settings.dataSaver': 'Musevhi weData', 'settings.loadShedding': 'Modhi yeLoad Shedding', 'settings.connectivity': 'Kubatana neSimba', 'settings.batteryLow': 'Bhatiri yapera',
    'offline.youAreOffline': 'Hausi pane intaneti', 'offline.changesWillSync': 'Shanduko dzichauya kana wabatana zvakare', 'offline.backOnline': 'Wadzoka paIntaneti',
    'data.estimatedUsage': 'Kushandiswa kwedata kunofungidzirwa', 'data.saved': 'Data yakachengetwa', 'data.mbUsed': 'MB dzakashandiswa',
    'day.sunday': 'Svondo', 'day.monday': 'Muvhuro', 'day.tuesday': 'Chipiri', 'day.wednesday': 'Chitatu', 'day.thursday': 'China', 'day.friday': 'Chishanu', 'day.saturday': 'Mugovera',
    'common.students': 'vadzidzi', 'common.start': 'Tanga', 'common.viewAll': 'Ona Zvose', 'common.helpCenter': 'Nzvimbo yeRubatsiro', 'common.installApp': 'Isa App', 'common.noUpcoming': 'Hapana zvidzidzo zvinouya vhiki rino', 'common.createLesson': 'Gadzira chidzidzo chitsva', 'common.welcomeBack': 'Mauya zvakare', 'common.live': 'KUITIKA', 'common.readyToStart': 'Zvagadzirira Kutanga', 'common.classTime': 'Nguva yeKirasi',
  },
  nde: {
    'nav.home': 'Ekhaya', 'nav.dashboard': 'Ideshibhodi', 'nav.lessons': 'Izifundo', 'nav.transcripts': 'Imibhalo', 'nav.help': 'Uncedo & Imithetho', 'nav.profile': 'Iphrofayili Yami', 'nav.logout': 'Phuma', 'nav.install': 'Faka i-App',
    'common.loading': 'Iyalayisha...', 'common.save': 'Gcina', 'common.cancel': 'Khansela', 'common.delete': 'Susa', 'common.edit': 'Lungisa', 'common.back': 'Emuva', 'common.next': 'Elandelayo', 'common.search': 'Dinga', 'common.noResults': 'Akukho okufunyenweyo', 'common.welcome': 'Siyakwemukela',
    'auth.login': 'Ngena', 'auth.signup': 'Bhalisa', 'auth.email': 'I-imeyli', 'auth.password': 'Iphasiwedi', 'auth.forgotPassword': 'Ukhohlwe iphasiwedi?', 'auth.confirmEmail': 'Khangela i-imeyli yakho ukuqinisekisa i-akhawunti yakho',
    'teacher.dashboard': 'Ideshibhodi Kambalisi', 'teacher.startLesson': 'Qalisa Isifundo', 'teacher.manageLessons': 'Phatha Izifundo', 'teacher.todaysLessons': 'Izifundo Zalamuhla', 'teacher.upcomingLessons': 'Izifundo Ezizayo', 'teacher.students': 'Abafundi', 'teacher.materials': 'Izinto Zokusebenza', 'teacher.attendance': 'Ukuba Khona', 'teacher.noLessonsToday': 'Akulazifundo ezibekelwe lamuhla', 'teacher.quickActions': 'Izenzo Eziphangisayo', 'teacher.broadcast': 'Qalisa Isifundo', 'teacher.continueBroadcast': 'Qhubeka Ukusakaza', 'teacher.copyLink': 'Kopela Ilinki', 'teacher.shareWhatsApp': 'Yabelana ngeWhatsApp',
    'student.timetable': 'Ithayimuthebuli Yami', 'student.joinNow': 'Ngena Khathesi', 'student.liveNow': 'Amaklasi Aphilayo Khathesi', 'student.noLessons': 'Akulazifundo ozinikwe zona', 'student.contactTeacher': 'Xhumana lombalisi wakho ukuze ubhaliswe ezifundweni', 'student.weeklySchedule': 'Ishedyuli yeViki', 'student.todaySchedule': 'Ishedyuli Yalamuhla', 'student.myTranscripts': 'Imibhalo Yami',
    'lesson.title': 'Isihloko Sesifundo', 'lesson.description': 'Incazelo', 'lesson.day': 'Ilanga', 'lesson.time': 'Isikhathi', 'lesson.recurring': 'Iyaphindaphinda Iviki Neviki', 'lesson.session': 'Iseshini', 'lesson.create': 'Dala Isifundo', 'lesson.duplicate': 'Phinda Isifundo',
    'settings.textSize': 'Ubukhulu Bombhalo', 'settings.language': 'Ulimi', 'settings.dataSaver': 'Isigcini seData', 'settings.loadShedding': 'Imodi yeLoad Shedding', 'settings.connectivity': 'Ukuxhumana & Amandla', 'settings.batteryLow': 'Ibhethri iphansi',
    'offline.youAreOffline': 'Awuxhunyiwe', 'offline.changesWillSync': 'Izinguquko zizavumelaniswa nxa uxhuma futhi', 'offline.backOnline': 'Usubuyile ku-inthaneti',
    'data.estimatedUsage': 'Ukusetshenziswa kwe-data okulinganiselweyo', 'data.saved': 'I-data egcinwe', 'data.mbUsed': 'MB ezisetshenzisiwe',
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  languages: LanguageInfo[];
  currentLanguage: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'tandem-language';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY) as LanguageCode;
    if (saved && translations[saved]) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
  };

  const t = (key: string): string => {
    const trans = translations[language];
    return (trans as any)?.[key] || (translations.en as any)?.[key] || key;
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: SUPPORTED_LANGUAGES, currentLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
