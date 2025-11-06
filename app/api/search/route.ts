import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const EXTERNAL_API_BASE = "http://localhost:3001";

interface FacultyMember {
  name: string;
  profileUrl: string;
  website: string;
  researchAreas: string[];
}

// Cache for faculty data
let facultyCache: FacultyMember[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

async function fetchFacultyData(): Promise<FacultyMember[]> {
  // Check cache
  const now = Date.now();
  if (facultyCache && now - cacheTimestamp < CACHE_DURATION) {
    return facultyCache;
  }

  try {
    const response = await fetch(
      "https://engineering.purdue.edu/ECE/People/Faculty",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PurdueECESearch/1.0)",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch faculty page: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const faculty: FacultyMember[] = [];

    // Parse faculty members from the page
    $('.faculty-member, .person, .profile-card, a[href*="ptProfile"]').each(
      (_, element) => {
        const $el = $(element);

        let profileLink =
          $el.attr("href") || $el.find('a[href*="ptProfile"]').attr("href");
        if (profileLink && !profileLink.startsWith("http")) {
          profileLink = `https://engineering.purdue.edu${profileLink}`;
        }

        const name =
          $el.find(".name, .faculty-name, h3, h4").first().text().trim() ||
          $el.text().trim();

        if (name && profileLink) {
          faculty.push({
            name,
            profileUrl: profileLink,
            website: "",
            researchAreas: [],
          });
        }
      }
    );

    if (faculty.length === 0) {
      $('a[href*="ptProfile"]').each((_, element) => {
        const $el = $(element);
        let profileLink = $el.attr("href") || "";
        if (profileLink && !profileLink.startsWith("http")) {
          profileLink = `https://engineering.purdue.edu${profileLink}`;
        }

        const name = $el.text().trim() || $el.find("*").first().text().trim();

        if (
          name &&
          profileLink &&
          !faculty.some((f) => f.profileUrl === profileLink)
        ) {
          faculty.push({
            name,
            profileUrl: profileLink,
            website: "",
            researchAreas: [],
          });
        }
      });
    }

    // Fetch details for each faculty member (limit to avoid timeout)
    const detailPromises = faculty.slice(0, 50).map(async (member) => {
      try {
        const detailResponse = await fetch(member.profileUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PurdueECESearch/1.0)",
          },
        });

        if (!detailResponse.ok) return member;

        const detailHtml = await detailResponse.text();
        const $detail = cheerio.load(detailHtml);

        const websiteLink = $detail(
          'a[href*="engineering.purdue.edu/~"], a[href*="personal"], .website a, a:contains("Website")'
        )
          .first()
          .attr("href");
        if (websiteLink) {
          member.website = websiteLink.startsWith("http")
            ? websiteLink
            : `https://engineering.purdue.edu${websiteLink}`;
        }

        const researchText = $detail(
          '.research, .research-interests, .interests, [class*="research"]'
        ).text();
        if (researchText) {
          const areas = researchText
            .split(/[,;]/)
            .map((area) => area.trim())
            .filter((area) => area.length > 0 && area.length < 100);
          member.researchAreas = areas.slice(0, 10);
        }

        return member;
      } catch (error) {
        console.error(`Error fetching details for ${member.name}:`, error);
        return member;
      }
    });

    const detailedFaculty = await Promise.all(detailPromises);

    // Update cache
    facultyCache = detailedFaculty;
    cacheTimestamp = now;

    return detailedFaculty;
  } catch (error) {
    console.error("Error fetching faculty data:", error);
    return [];
  }
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const regexPattern = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${regexPattern}$`, "i");
}

function searchByName(
  faculty: FacultyMember[],
  query: string
): FacultyMember[] {
  const regex = wildcardToRegex(query);
  return faculty.filter((member) => regex.test(member.name));
}

function searchByResearch(
  faculty: FacultyMember[],
  query: string
): FacultyMember[] {
  const queryLower = query.toLowerCase();

  // Simple case-insensitive substring match against research areas
  return faculty.filter((member) => {
    const researchText = member.researchAreas.join(" ").toLowerCase();
    return researchText.includes(queryLower);
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const type = searchParams.get("type") || "name";

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required", results: [] },
        { status: 400 }
      );
    }

    let results: FacultyMember[] = [];

    if (type === "name") {
      const response = await fetch(
        `${EXTERNAL_API_BASE}/api/faculty/search/name?query=${encodeURIComponent(
          query
        )}`
      );
      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`);
      }
      const data = await response.json();
      results = normalizeResults(data.results || []);
    } else if (type === "research") {
      const response = await fetch(
        `${EXTERNAL_API_BASE}/api/faculty/search/research?query=${encodeURIComponent(
          query
        )}`
      );
      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`);
      }
      const data = await response.json();
      results = normalizeResults(data.results || []);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search faculty", results: [] },
      { status: 500 }
    );
  }
}

// Normalize the data to ensure researchAreas is always an array
function normalizeResults(results: any[]): FacultyMember[] {
  return results.map((faculty) => ({
    name: faculty.name || "",
    profileUrl: faculty.profileUrl || "",
    website: faculty.website || "",
    researchAreas: Array.isArray(faculty.researchAreas)
      ? faculty.researchAreas
      : faculty.researchAreas
      ? [faculty.researchAreas]
      : [],
  }));
}
