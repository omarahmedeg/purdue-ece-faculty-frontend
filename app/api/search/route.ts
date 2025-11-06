import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const EXTERNAL_API_BASE = "https://ece-176991989436.us-central1.run.app//";

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
