SELECT
  `g`.`id` AS `id`,
  `g`.`enrollment_id` AS `enrollmentId`,
  `g`.`opportunity` AS `opportunity`,
  `g`.`grade` AS `grade`,
  `g`.`type` AS `type`,
  `g`.`temporality` AS `temporality`,
  `sp`.`id` AS `subjectId`,
  `sp`.`subject_name` AS `subjectName`,
  `sp`.`subject_key` AS `subjectKey`,
  `sices_v3`.`ve`.`studentId` AS `studentId`,
  `sices_v3`.`ve`.`curp` AS `curp`,
  `sices_v3`.`ve`.`fullName` AS `fullName`,
  `sices_v3`.`ve`.`gender` AS `gender`,
  `sices_v3`.`ve`.`studentNumber` AS `studentCode`,
  `sices_v3`.`ve`.`classCode` AS `classCode`,
  `sices_v3`.`ve`.`semester` AS `semester`,
  `sices_v3`.`ve`.`schoolYear` AS `schoolYear`,
  `sices_v3`.`ve`.`educationalProgram` AS `educationalProgram`,
  `stats`.`failedSubjectsCount` AS `failedSubjectsCount`,
  `stats`.`currentOpportunity` AS `currentOpportunity`,
  `stats`.`canTakeExtraordinary` AS `canTakeExtraordinary`,
  `stats`.`canTakeSecondOpportunity` AS `canTakeSecondOpportunity`,
  `stats`.`isDropoutCandidate` AS `isDropoutCandidate`
FROM
  (
    (
      (
        (
          `sices_v3`.`grades` `g`
          JOIN `sices_v3`.`enrollments` `e` ON((`g`.`enrollment_id` = `e`.`id`))
        )
        JOIN `sices_v3`.`study_plans` `sp` ON((`g`.`subject_id` = `sp`.`id`))
      )
      JOIN `sices_v3`.`view_enrollments` `ve` ON((`sices_v3`.`ve`.`id` = `e`.`id`))
    )
    JOIN (
      SELECT
        `e2`.`id` AS `enrollmentId`,
        max(`g2`.`opportunity`) AS `currentOpportunity`,
        sum(
          (
            CASE
              WHEN (
                (
                  `g2`.`opportunity` = (
                    SELECT
                      max(`g3`.`opportunity`)
                    FROM
                      `sices_v3`.`grades` `g3`
                    WHERE
                      (`g3`.`enrollment_id` = `e2`.`id`)
                  )
                )
                AND (`g2`.`temporality` = 'TEMPORAL')
                AND (`g2`.`type` = 'RE')
              ) THEN 1
              ELSE 0
            END
          )
        ) AS `failedSubjectsCount`,
(
          CASE
            WHEN (
              (max(`g2`.`opportunity`) = 0)
              AND (
                `sices_v3`.`ve2`.`semester` BETWEEN 1
                AND 7
              )
              AND (
                sum(
                  (
                    CASE
                      WHEN (
                        (`g2`.`opportunity` = 0)
                        AND (`g2`.`temporality` = 'TEMPORAL')
                        AND (`g2`.`type` = 'RE')
                      ) THEN 1
                      ELSE 0
                    END
                  )
                ) BETWEEN 1
                AND 4
              )
            ) THEN 1
            ELSE 0
          END
        ) AS `canTakeExtraordinary`,
(
          CASE
            WHEN (
              (max(`g2`.`opportunity`) = 1)
              AND (
                sum(
                  (
                    CASE
                      WHEN (
                        (`g2`.`opportunity` = 1)
                        AND (`g2`.`temporality` = 'TEMPORAL')
                        AND (`g2`.`type` = 'RE')
                      ) THEN 1
                      ELSE 0
                    END
                  )
                ) BETWEEN 1
                AND 4
              )
            ) THEN 1
            ELSE 0
          END
        ) AS `canTakeSecondOpportunity`,
(
          CASE
            WHEN (
              (
                `sices_v3`.`ve2`.`semester` BETWEEN 1
                AND 7
              )
              AND (
                sum(
                  (
                    CASE
                      WHEN (
                        (`g2`.`opportunity` = 0)
                        AND (`g2`.`temporality` = 'TEMPORAL')
                        AND (`g2`.`type` = 'RE')
                      ) THEN 1
                      ELSE 0
                    END
                  )
                ) >= 5
              )
            ) THEN 1
            WHEN (
              (max(`g2`.`opportunity`) = 2)
              AND (
                sum(
                  (
                    CASE
                      WHEN (
                        (`g2`.`opportunity` = 2)
                        AND (`g2`.`temporality` = 'TEMPORAL')
                        AND (`g2`.`type` = 'RE')
                      ) THEN 1
                      ELSE 0
                    END
                  )
                ) >= 1
              )
            ) THEN 1
            ELSE 0
          END
        ) AS `isDropoutCandidate`
      FROM
        (
          (
            `sices_v3`.`enrollments` `e2`
            JOIN `sices_v3`.`grades` `g2` ON((`g2`.`enrollment_id` = `e2`.`id`))
          )
          JOIN `sices_v3`.`view_enrollments` `ve2` ON((`sices_v3`.`ve2`.`id` = `e2`.`id`))
        )
      GROUP BY
        `e2`.`id`,
        `sices_v3`.`ve2`.`semester`
    ) `stats` ON((`stats`.`enrollmentId` = `e`.`id`))
  )
WHERE
  (
    (`g`.`temporality` = 'TEMPORAL')
    AND (`g`.`type` = 'RE')
  )