SELECT
  `stp`.`id` AS `id`,
  `p`.`curp` AS `curp`,
  `p`.`gender` AS `gender`,
  `p`.`first_name` AS `firstName`,
  `p`.`first_last_name` AS `firstLastName`,
  `p`.`second_last_name` AS `secondLastName`,
  `s`.`title_key` AS `titleKey`,
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
  `stp`.`is_classroom_teacher` AS `isClassroomTeacher`,
  `stp`.`level_taught` AS `levelTaught`,
  `stp`.`staff_id` AS `staffId`
FROM
  (
    (
      `sices_v3`.`staff_teaching_profile` `stp`
      LEFT JOIN `sices_v3`.`staff` `s` ON((`stp`.`staff_id` = `s`.`id`))
    )
    LEFT JOIN `sices_v3`.`persons` `p` ON((`s`.`person_id` = `p`.`id`))
  )