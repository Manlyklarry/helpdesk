-- Returns all dashboard KPI metrics in a single table scan.
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  "totalTickets"        bigint,
  "openTickets"         bigint,
  "processingTickets"   bigint,
  "resolvedTickets"     bigint,
  "aiResolvedTickets"   bigint,
  "aiResolutionRate"    integer,
  "avgResolutionTimeMs" bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)                                                         AS total,
      COUNT(*) FILTER (WHERE status = 'open')                         AS open_count,
      COUNT(*) FILTER (WHERE status = 'processing')                   AS processing_count,
      COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))        AS resolved_count,
      COUNT(*) FILTER (WHERE "resolvedByAi")                          AS ai_resolved_count,
      AVG(
        EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000
      ) FILTER (WHERE status IN ('resolved', 'closed'))               AS avg_ms
    FROM "Ticket"
  )
  SELECT
    total::bigint,
    open_count::bigint,
    processing_count::bigint,
    resolved_count::bigint,
    ai_resolved_count::bigint,
    CASE WHEN resolved_count > 0
      THEN ROUND(ai_resolved_count::numeric / resolved_count::numeric * 100)::integer
      ELSE 0
    END,
    CASE WHEN avg_ms IS NOT NULL
      THEN ROUND(avg_ms)::bigint
      ELSE NULL::bigint
    END
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Returns ticket counts grouped by day for the past N days (default 30).
-- Every day in the range is included; days with no tickets return 0.
-- The date column is returned as a YYYY-MM-DD text to avoid timezone
-- ambiguity when the value crosses to JavaScript.
CREATE OR REPLACE FUNCTION get_tickets_per_day(days_back integer DEFAULT 30)
RETURNS TABLE (date text, count bigint) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_back - 1) * INTERVAL '1 day',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::date AS d
  ),
  daily_counts AS (
    SELECT "createdAt"::date AS d, COUNT(*)::bigint AS cnt
    FROM "Ticket"
    WHERE "createdAt"::date >= CURRENT_DATE - (days_back - 1) * INTERVAL '1 day'
    GROUP BY "createdAt"::date
  )
  SELECT
    TO_CHAR(ds.d, 'YYYY-MM-DD'),
    COALESCE(dc.cnt, 0::bigint)
  FROM date_series ds
  LEFT JOIN daily_counts dc ON dc.d = ds.d
  ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql;
