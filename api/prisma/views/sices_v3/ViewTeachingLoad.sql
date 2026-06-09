SELECT
  `tl`.`id` AS `id`,
  `c`.`class_code` AS `classKey`,
  `sp`.`subject_name` AS `subjectName`,
  `sices_v3`.`vstp`.`curp` AS `curp`,
  `sices_v3`.`vstp`.`titleKey` AS `titleKey`,
  `sices_v3`.`vstp`.`fullName` AS `fullName`,
  `sices_v3`.`vstp`.`gender` AS `gender`,
  `sp`.`id` AS `subjectId`,
  `tl`.`staff_teaching_profile_id` AS `staffTeachingProfileId`,
  `tl`.`study_plan_id` AS `studyPlanId`,
  `tl`.`class_id` AS `classId`
FROM
  (
    (
      (
        `sices_v3`.`teaching_load` `tl`
        LEFT JOIN `sices_v3`.`classes` `c` ON((`tl`.`class_id` = `c`.`id`))
      )
      LEFT JOIN `sices_v3`.`study_plans` `sp` ON((`tl`.`study_plan_id` = `sp`.`id`))
    )
    LEFT JOIN `sices_v3`.`view_staff_teaching_profile` `vstp` ON(
      (
        `tl`.`staff_teaching_profile_id` = `sices_v3`.`vstp`.`id`
      )
    )
  )