SELECT
  `s`.`id` AS `id`,
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
  `p`.`gender` AS `gender`,
  `p`.`birth_date` AS `birthDate`,
  timestampdiff(YEAR, `p`.`birth_date`, curdate()) AS `employeeAge`,
  `p`.`photo_url` AS `photoUrl`,
  `s`.`institutional_mail` AS `institutionalMail`,
  `s`.`payment_unique_key` AS `paymentUniqueKey`,
  `s`.`system_entry_date` AS `systemEntryDate`,
  `s`.`school_entry_date` AS `schoolEntryDate`,
  timestampdiff(YEAR, `s`.`system_entry_date`, curdate()) AS `systemYears`,
  timestampdiff(YEAR, `s`.`school_entry_date`, curdate()) AS `schoolYears`,
  `st`.`name` AS `staffTypeName`,
  `et`.`name` AS `employmentTypeName`,
  `ed`.`name` AS `employmentDurationName`,
  `r`.`name` AS `responsibilityName`,
  `c`.`name` AS `categoryName`,
  `t`.`key` AS `titleKey`,
  `ss`.`name` AS `staffStatus`,
  `ss`.`is_active` AS `isActive`,
  `s`.`person_id` AS `personId`,
  `s`.`staff_type_id` AS `staffTypeId`,
  `s`.`employment_type_id` AS `employmentTypeId`,
  `s`.`employment_duration_id` AS `employmentDurationId`,
  `s`.`responsibility_id` AS `responsibilityId`,
  `s`.`category_id` AS `categoryId`
FROM
  (
    (
      (
        (
          (
            (
              (
                (
                  `sices_v3`.`staff` `s`
                  LEFT JOIN `sices_v3`.`persons` `p` ON((`s`.`person_id` = `p`.`id`))
                )
                LEFT JOIN `sices_v3`.`titles` `t` ON((`s`.`title_key` = `t`.`key`))
              )
              LEFT JOIN `sices_v3`.`staff_type` `st` ON((`s`.`staff_type_id` = `st`.`id`))
            )
            LEFT JOIN `sices_v3`.`employment_type` `et` ON((`s`.`employment_type_id` = `et`.`id`))
          )
          LEFT JOIN `sices_v3`.`employment_duration` `ed` ON((`s`.`employment_duration_id` = `ed`.`id`))
        )
        LEFT JOIN `sices_v3`.`responsibilities` `r` ON((`s`.`responsibility_id` = `r`.`id`))
      )
      LEFT JOIN `sices_v3`.`categories` `c` ON((`s`.`category_id` = `c`.`id`))
    )
    LEFT JOIN `sices_v3`.`staff_status` `ss` ON((`s`.`staff_status_id` = `ss`.`id`))
  )