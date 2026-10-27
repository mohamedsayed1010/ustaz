import type { City, Grade, Stage, Subject, SubjectKey } from '@/types'

/**
 * Subject accents.
 *
 * Every subject has its own hue so covers, tiles and icons can be told apart
 * at a glance. Sciences sit in the cool band, languages and humanities in the
 * warm one; nothing lands in the yellow range, which belongs to no part of
 * this identity, and the brand orange (~25) is left to the brand itself.
 *
 * Counts are never stored here; they come from the API.
 */
export const subjects: Subject[] = [
  { key: 'physics', name: 'الفيزياء', nameEn: 'Physics', hue: 199 },
  { key: 'math', name: 'الرياضيات', nameEn: 'Mathematics', hue: 226 },
  { key: 'chemistry', name: 'الكيمياء', nameEn: 'Chemistry', hue: 168 },
  { key: 'biology', name: 'الأحياء', nameEn: 'Biology', hue: 145 },
  { key: 'science', name: 'العلوم', nameEn: 'Science', hue: 186 },
  { key: 'arabic', name: 'اللغة العربية', nameEn: 'Arabic', hue: 256 },
  { key: 'english', name: 'اللغة الإنجليزية', nameEn: 'English', hue: 340 },
  { key: 'french', name: 'اللغة الفرنسية', nameEn: 'French', hue: 300 },
  { key: 'history', name: 'التاريخ', nameEn: 'History', hue: 8 },
  { key: 'geology', name: 'الجيولوجيا', nameEn: 'Geology', hue: 128 },
]

export const subjectByKey = (key: SubjectKey): Subject =>
  subjects.find((s) => s.key === key) ?? subjects[0]

export const subjectName = (key: SubjectKey): string => subjectByKey(key).name

export const stages: Stage[] = [
  { key: 'primary', name: 'المرحلة الابتدائية', grades: ['p4', 'p5', 'p6'] },
  { key: 'preparatory', name: 'المرحلة الإعدادية', grades: ['prep1', 'prep2', 'prep3'] },
  { key: 'secondary', name: 'المرحلة الثانوية', grades: ['sec1', 'sec2', 'sec3'] },
]

export const grades: Grade[] = [
  { key: 'p4', name: 'الصف الرابع الابتدائي', shortName: '٤ ابتدائي', stage: 'primary' },
  { key: 'p5', name: 'الصف الخامس الابتدائي', shortName: '٥ ابتدائي', stage: 'primary' },
  { key: 'p6', name: 'الصف السادس الابتدائي', shortName: '٦ ابتدائي', stage: 'primary' },
  { key: 'prep1', name: 'الصف الأول الإعدادي', shortName: '١ إعدادي', stage: 'preparatory' },
  { key: 'prep2', name: 'الصف الثاني الإعدادي', shortName: '٢ إعدادي', stage: 'preparatory' },
  { key: 'prep3', name: 'الصف الثالث الإعدادي', shortName: '٣ إعدادي', stage: 'preparatory' },
  { key: 'sec1', name: 'الصف الأول الثانوي', shortName: '١ ثانوي', stage: 'secondary' },
  { key: 'sec2', name: 'الصف الثاني الثانوي', shortName: '٢ ثانوي', stage: 'secondary' },
  { key: 'sec3', name: 'الصف الثالث الثانوي', shortName: '٣ ثانوي', stage: 'secondary' },
]

export const gradeByKey = (key: string): Grade =>
  grades.find((g) => g.key === key) ?? grades[grades.length - 1]

export const gradeName = (key: string): string => gradeByKey(key).name

export const gradeShortName = (key: string): string => gradeByKey(key).shortName

export const cities: City[] = [
  { key: 'cairo', name: 'القاهرة', governorate: 'القاهرة' },
  { key: 'giza', name: 'الجيزة', governorate: 'الجيزة' },
  { key: 'alexandria', name: 'الإسكندرية', governorate: 'الإسكندرية' },
  { key: 'mansoura', name: 'المنصورة', governorate: 'الدقهلية' },
  { key: 'tanta', name: 'طنطا', governorate: 'الغربية' },
  { key: 'zagazig', name: 'الزقازيق', governorate: 'الشرقية' },
  { key: 'assiut', name: 'أسيوط', governorate: 'أسيوط' },
  { key: 'portsaid', name: 'بورسعيد', governorate: 'بورسعيد' },
  { key: 'minya', name: 'المنيا', governorate: 'المنيا' },
  { key: 'fayoum', name: 'الفيوم', governorate: 'الفيوم' },
]

export const cityByKey = (key: string): City =>
  cities.find((c) => c.key === key) ?? cities[0]

export const cityName = (key: string): string => cityByKey(key).name
