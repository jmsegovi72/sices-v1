SELECT
  `p`.`id` AS `id`,
  `p`.`curp` AS `curp`,
  `p`.`first_name` AS `first_name`,
  `p`.`first_last_name` AS `first_last_name`,
  `p`.`second_last_name` AS `second_last_name`,
  concat(
    `p`.`first_name`,
    ' ',
    `p`.`first_last_name`,
    IF(
      (`p`.`second_last_name` <> ''),
      concat(' ', `p`.`second_last_name`),
      ''
    )
  ) AS `full_name`,
(
    CASE
      WHEN (
        (`p`.`gender` IS NULL)
        OR (`p`.`gender` = '')
      ) THEN 'No especificado'
      ELSE `p`.`gender`
    END
  ) AS `gender`,
  `p`.`birth_date` AS `birth_date`,
  timestampdiff(YEAR, `p`.`birth_date`, curdate()) AS `age`,
(
    CASE
      WHEN (
        (`p`.`nationality` IS NULL)
        OR (`p`.`nationality` = '')
      ) THEN 'No especificado'
      ELSE `p`.`nationality`
    END
  ) AS `nationality`,
(
    CASE
      WHEN (`p`.`state_id` IS NULL) THEN 'No especificado'
      ELSE coalesce(`s`.`name`, 'No especificado')
    END
  ) AS `birth_state`,
(
    CASE
      WHEN (`p`.`municipality_id` IS NULL) THEN 'No especificado'
      ELSE cast(`p`.`municipality_id` AS char CHARSET utf8mb4)
    END
  ) AS `municipality_id`,
(
    CASE
      WHEN (`p`.`municipality_id` IS NULL) THEN 'No especificado'
      ELSE coalesce(`m`.`municipality`, 'No especificado')
    END
  ) AS `birth_municipality`,
(
    CASE
      WHEN (`p`.`phone` IS NULL) THEN 'No especificado'
      WHEN (left(`p`.`phone`, 2) = '00') THEN 'No especificado'
      ELSE `p`.`phone`
    END
  ) AS `personal_phone`,
(
    CASE
      WHEN (
        (`p`.`personal_email` IS NULL)
        OR (`p`.`personal_email` = '')
      ) THEN 'No especificado'
      ELSE `p`.`personal_email`
    END
  ) AS `personal_email`,
(
    CASE
      WHEN (`p`.`rfc` IS NULL) THEN 'No especificado'
      WHEN regexp_like(right(`p`.`rfc`, 3), '^(TM[0-9]|TMP)$') THEN 'No especificado'
      ELSE `p`.`rfc`
    END
  ) AS `rfc`
FROM
  (
    (
      `sices_v3`.`persons` `p`
      LEFT JOIN `sices_v3`.`states` `s` ON((`p`.`state_id` = `s`.`id`))
    )
    LEFT JOIN `sices_v3`.`municipalities` `m` ON((`p`.`municipality_id` = `m`.`id`))
  )