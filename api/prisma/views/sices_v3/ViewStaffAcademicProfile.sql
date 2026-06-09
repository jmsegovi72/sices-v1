SELECT
  `sap`.`id` AS `id`,
  `p`.`curp` AS `curp`,
  `p`.`first_name` AS `firstName`,
  `p`.`first_last_name` AS `firstLastName`,
  `p`.`second_last_name` AS `secondLastName`,
  concat(
    `p`.`first_name`,
    ' ',
    `p`.`first_last_name`,
    IF(
      (`p`.`second_last_name` <> ''),
      concat(' ', `p`.`second_last_name`),
      ''
    )
  ) AS `fullName`,
  `el`.`level` AS `educationLevel`,
  `sap`.`is_graduate` AS `isGraduate`,
  IFNULL(
    date_format(`sap`.`graduation_date`, '%Y-%m-%d'),
    'No especificado'
  ) AS `graduationDate`,
  coalesce(`soo`.`name`, 'No especificado') AS `schoolOfOrigin`,
  coalesce(`soo`.`funding_source`, 'No especificado') AS `fundingSource`,
  `ka`.`name` AS `knowledgeArea`,
  `d`.`name` AS `discipline`,
  `sap`.`sni_level` AS `sniLevel`,
  `sap`.`research_project` AS `researchProject`,
  `sap`.`thesis_topic` AS `thesisTopic`,
  `sap`.`has_done_stay` AS `hasDoneStay`,
  `sap`.`staff_id` AS `staffId`,
  `sap`.`education_level_id` AS `educationLevelId`,
  IFNULL(`sap`.`school_of_origin_id`, 'Por definir') AS `schoolOfOriginId`,
  `sap`.`knowledge_area_id` AS `knowledgeAreaId`,
  `sap`.`discipline_id` AS `disciplineId`
FROM
  (
    (
      (
        (
          (
            (
              `sices_v3`.`staff_academic_profile` `sap`
              LEFT JOIN `sices_v3`.`staff` `s` ON((`sap`.`staff_id` = `s`.`id`))
            )
            LEFT JOIN `sices_v3`.`persons` `p` ON((`s`.`person_id` = `p`.`id`))
          )
          LEFT JOIN `sices_v3`.`education_levels` `el` ON((`sap`.`education_level_id` = `el`.`id`))
        )
        LEFT JOIN `sices_v3`.`schools_of_origin` `soo` ON((`sap`.`school_of_origin_id` = `soo`.`id`))
      )
      LEFT JOIN `sices_v3`.`knowledge_areas` `ka` ON((`sap`.`knowledge_area_id` = `ka`.`id`))
    )
    LEFT JOIN `sices_v3`.`disciplines` `d` ON((`sap`.`discipline_id` = `d`.`id`))
  )