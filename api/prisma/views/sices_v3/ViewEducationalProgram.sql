SELECT
  `ep`.`id` AS `id`,
  `ep`.`code` AS `code`,
  `ep`.`ep_key` AS `epKey`,
  `ep`.`subes_key` AS `subesKey`,
  `ep`.`name` AS `name`,
  `ep`.`study_plan` AS `studyPlan`,
  `ep`.`credits` AS `credits`,
  `m`.`name` AS `modality`,
  `ad`.`name` AS `academicDiscipline`,
  `sol`.`offered_education_level` AS `offeredEducationLevel`,
  `ep`.`academic_discipline_id` AS `academicDisciplineId`,
  `ep`.`modality_id` AS `modalityId`,
  `ad`.`school_offered_level_id` AS `schoolOfferedLevelId`
FROM
  (
    (
      (
        `sices_v3`.`educational_programs` `ep`
        LEFT JOIN `sices_v3`.`modalities` `m` ON((`ep`.`modality_id` = `m`.`id`))
      )
      LEFT JOIN `sices_v3`.`academic_disciplines` `ad` ON((`ep`.`academic_discipline_id` = `ad`.`id`))
    )
    LEFT JOIN `sices_v3`.`school_offered_levels` `sol` ON((`ad`.`school_offered_level_id` = `sol`.`id`))
  )